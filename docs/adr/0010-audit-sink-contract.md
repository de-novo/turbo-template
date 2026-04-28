# 0010 — Audit sink contract, persistence deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Compliance regimes (SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR Article 30) all expect a forensic record
of "who did what to which resource, with what outcome, when". Incident response uses the same record
to reconstruct what happened during a breach. Even products with no formal compliance posture want a
tamper-evident trail of admin actions and denied access attempts.

Picking the persistence backend on day one biases every fork toward one operational story —
DB-backed `audit_events` table assumes the same Postgres handles forensics; SIEM forwarding (Splunk,
Datadog, CloudWatch, Honeycomb) assumes that pipeline exists; immutable WORM storage (S3 + Object
Lock, GCS Bucket Lock) assumes the regulated deploy. ADR
[0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) applies: ship the contract,
defer the backend.

The audit lane is also distinct from two adjacent existing concerns:

- **`system_events`** is operational telemetry — counters and metrics for system behavior. Audit is
  per-actor, per-action, per-resource forensic record. They have different retention policies
  (telemetry: weeks; audit: years) and different access controls (telemetry: developers; audit:
  compliance + security only).
- **Outbox** (ADR [0005](./0005-outbox-contract.md)) is the publish lifecycle for domain events.
  Audit _can ride_ the outbox for durable async forwarding to a SIEM, but the audit entry shape is
  the source of truth — the outbox row is the transport.

## Decision

Ship the audit contract with a memory recorder for tests and a no-op default for solo deploys with
no compliance requirement. Real persistence plugs in by implementing `AuditSink`.

- **Schema** — `@repo/contracts/audit.ts` exports `auditOutcomeSchema` (`success` / `failure` /
  `denied`), `auditActorSchema` (optional `userId`, optional `serviceName`, `roles`, optional
  `tenantId` — service-initiated actions like a scheduled-job tick set `serviceName`),
  `auditResourceSchema` (kind + optional id), `auditEntrySchema` (server-assigned: `id`,
  `occurredAt`, plus actor / action / resource / outcome / requestId / correlationId / details), and
  `newAuditEntrySchema` (omits the server-assigned fields — caller supplies the rest).
- **Sink port** — `@repo/infrastructure/audit.ts` exports `AuditSink` (single Effect-typed method:
  `record(entry) → AuditEntry`). The sink stamps `id` and `occurredAt`; the caller supplies
  everything else.
- **Adapters** —
  - `noopAuditSink` — stamps `id: "noop"` and the current timestamp, returns the would-be entry, and
    stores nothing. The lane is inert until a real sink is wired.
  - `createMemoryAuditSink()` — appends to an internal list, exposes `entries()` (snapshot — not
    live) and `clear()` for tests. Sufficient for any handler test that needs to assert "the audit
    entry was emitted".

The `denied` outcome is first-class — every denied policy decision (ADR
[0006](./0006-policy-port.md)) is an audit candidate, and the contract is shaped so a guard can
record it without ceremony: `audit.record({ actor, action, resource, outcome: "denied" })`.

## Consequences

- **Benefits**:
  - Application code that calls `audit.record({ actor, action, resource, outcome })` lands a stable
    shape on day one. Swapping `noopAuditSink` for a Drizzle insert, a SIEM forwarder, or an
    outbox-backed asynchronous writer is a wiring change.
  - Tests for any handler that should produce an audit entry can use `createMemoryAuditSink` and
    assert against `entries()`. No SIEM sandbox, no audit-table fixture in CI.
  - The `tenantId` on `actor` (per ADR [0004](./0004-multi-tenancy-contract.md)) means per-tenant
    retention / per-tenant SIEM index / per-tenant breach scoping all work without retrofitting.
  - Decoupling the _contract_ from the _transport_ means an audit entry can ride the outbox (ADR
    0005), be sent inline to a SIEM, be written to a DB table, or be fanned to multiple sinks (a
    `compositeAuditSink` is a five-line wrapper) without changing handler code.
- **Costs**:
  - The `details` field is `Record<string, unknown>`. The contract intentionally does not specify
    what consumers should put in it (request body, policy rule name, before/after diff for an
    update). A future ADR may codify a `details` shape per action namespace if a clear pattern
    emerges.
  - The contract does not enforce _retention_. Retention is a persistence-layer policy — the sink
    decides how long entries live, not the contract.
  - The memory sink is not append-only / tamper-evident. A real sink targeting WORM storage (S3 +
    Object Lock) gets that property from the storage layer; the contract does not promise it.
- **Risks / open questions**:
  - The relationship to `system_events` is "they are different concerns; do not merge." Tempting to
    overload the existing table when the first audit need lands; the ADR is explicit that this is
    the wrong move (different retention, different access control, different write cardinality).
  - `causationId` is not on the audit entry shape (it is on `eventMetadataSchema`). A future ADR may
    add it if a real consumer needs causal chaining; today, `correlationId` is the entire
    cross-action linkage story.

## Alternatives considered

- **Reuse `system_events` for audit**: rejected. Different retention windows (telemetry: weeks;
  audit: years), different access controls (telemetry: dev; audit: compliance + security), different
  write cardinality. Merging conflates retention and access policies across two concerns that need
  to diverge.
- **Reuse `outbox` directly without a separate audit sink**: rejected. Audit and event publish are
  different concerns: an audit entry is a _record_, not a _message_. A consumer that wants to
  _publish_ audit entries to a SIEM via the outbox can do so explicitly — the audit sink writes the
  entry, an adapter forwards via the outbox — but the contract does not collapse the two.
- **Ship a Drizzle `audit_events` table by default**: rejected per ADR 0001. Picks one persistence
  story; forks that target a SIEM-only pipeline (no DB persistence) have to remove the default table
  and its migration before adding their own.
- **Tri-state outcome (`success` / `failure` / `denied`) versus a separate `denied` flag**: chosen
  the enum. Denials are a distinct forensic class — a failed delete (DB outage) is different from a
  denied delete (policy refused) — and conflating them under `failure: { reason: "denied" }` makes
  the most-queried filter (`SELECT WHERE outcome = 'denied'`) more awkward than necessary.

## References

- `packages/contracts/src/audit.ts` — schemas + types
- `packages/infrastructure/src/audit.ts` — `AuditSink` port + memory + noop
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — `tenantId` carries through
- ADR [0005 — Outbox contract](./0005-outbox-contract.md) — typical transport for async audit
  forwarding
- ADR [0006 — Policy port](./0006-policy-port.md) — denied decisions are first-class audit triggers
- `packages/db/src/schema/system-events.ts` — distinct concern (operational telemetry)
