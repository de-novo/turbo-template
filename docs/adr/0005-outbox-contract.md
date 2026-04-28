# 0005 — Outbox contract, relay deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Domain code that mutates the database and also needs to publish a message to a bus (Kafka, SNS,
webhook, internal event grid) faces the dual-write problem: if the DB commit succeeds and the
publish fails, the system is inconsistent; if the publish succeeds and the DB commit rolls back, the
bus carries an event that never happened.

The transactional outbox pattern resolves this by writing the message to a local `outbox` table
inside the same DB transaction as the business mutation, then a separate relay process reads pending
rows and forwards them to the real publisher. The DB transaction is the only consistency boundary;
the relay is at-least-once and idempotent (`markPublished` flips the row).

The template needs the _contract_ on day one — the `outbox` table, the row shape, the relay port —
so domain code written before any real bus is wired lands in the correct shape. Picking the relay
implementation (Postgres `LISTEN/NOTIFY` worker, polling worker, Debezium CDC, BullMQ adapter,
Inngest, etc.) is exactly the kind of choice ADR
[0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) defers to the consumer.

## Decision

Ship the outbox contract across three layers. No real relay; an in-memory relay covers tests and the
no-op relay covers solo deploys that haven't activated the lane.

- **Storage** — `packages/db/src/schema/outbox.ts` defines the Drizzle table: `id` (uuid), `topic`,
  `eventName`, `eventVersion`, `payload` (jsonb), `metadata` (jsonb), `tenantId` (nullable text —
  mirrors `@repo/contracts/tenant`), `createdAt`, `publishedAt` (nullable), `lastError` (nullable),
  `attemptCount`. Indexes: `(publishedAt, createdAt)` for the relay's pending-claim query, and
  `(tenantId)` for tenant-scoped diagnostics. Migration `drizzle/0002_quiet_dark_beast.sql` ships
  it.
- **Schema** — `@repo/contracts/outbox.ts` exports `outboxEntrySchema` and `newOutboxEntrySchema`.
  `metadata` reuses `eventMetadataSchema` so an outbox row carries `eventId`, `occurredAt`,
  `correlationId`, and `causationId` — enough provenance to replay or trace after a relay restart.
- **Relay port** — `@repo/infrastructure/outbox.ts` defines `OutboxRelay` with `claimBatch`,
  `markPublished`, `markFailed` (Effect-typed). `enqueue` is **not** on the port: outbox writes
  happen inside the application's existing DB transaction, alongside the business mutation. The
  memory adapter (`createMemoryOutboxRelay`) exposes `enqueue` and `pendingCount` only for testing
  the relay loop in isolation. `noopOutboxRelay` returns empty claims and accepts mark calls
  silently.

The outbox table is **distinct from `system_events`**: `system_events` is an audit log of
already-fired events with no publish lifecycle; `outbox` carries the publish lifecycle
(`publishedAt`, `lastError`, `attemptCount`).

## Consequences

- **Benefits**:
  - Domain code that calls `tx.insert(outbox).values(...)` inside a transaction lands the correct
    shape on day one. Activating a real relay is a single PR — implement `OutboxRelay` against the
    chosen publisher, mount it as a worker, and remove the deferred entry in `docs/capabilities.md`.
  - The `(publishedAt, createdAt)` index pre-optimizes the canonical claim query
    (`WHERE published_at IS NULL ORDER BY created_at LIMIT $n FOR UPDATE SKIP LOCKED`); no schema
    change needed when a real relay arrives.
  - `tenantId` flows through the contract, so per-tenant replay / dead-letter strategies work
    without retrofitting (per ADR
    [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md)).
  - Solo deploys pay the cost of one empty table; the relay can stay `noopOutboxRelay` until there
    is a real bus to publish to.
- **Costs**:
  - The `outbox` table exists in every fork's database from day one, even forks that never publish
    anything. The footprint is trivial (one row per side-effect) but it is a deliberate bias toward
    the pattern.
  - `enqueue` is not on the port, which means consumers writing the insert directly in a transaction
    must know the outbox table's column shape. The recipe (TODO) will document the canonical insert
    pattern; the alternative — putting `enqueue` on the port and threading a DB transaction through
    it — couples the relay to a Drizzle transaction handle and breaks the abstraction.
- **Risks / open questions**:
  - The relay's "claim and mark" loop has subtle correctness requirements (lock contention,
    failure-and-retry budget, idempotency). The memory adapter does not exercise those; a real
    Postgres relay should layer integration tests against `SELECT ... FOR UPDATE SKIP LOCKED`
    semantics. That work belongs to the fork that wires the real relay.
  - The relationship between outbox `metadata` and `@repo/contracts/events.ts`'s `DomainEvent` is
    _use-the-same-shape_. If a future ADR splits them (e.g. richer outbox metadata for retries),
    `eventMetadataSchema` should grow rather than `outboxEntrySchema` diverging.

## Alternatives considered

- **Publish directly from domain code (no outbox)**: rejected. The dual-write inconsistency is
  exactly the failure mode the pattern exists to prevent. Even a "best effort" direct publish bakes
  in an availability coupling between the DB commit and the bus.
- **Ship a real relay (e.g. polling worker) by default**: rejected per ADR 0001. Picks a strategy
  for the fork; a polling worker has different ops characteristics than `LISTEN/NOTIFY` or CDC, and
  forks shouldn't have to remove a chosen strategy before adding theirs.
- **Put `enqueue` on the `OutboxRelay` port and pass a Drizzle transaction**: rejected. Couples the
  port to a specific ORM transaction shape, defeats the point of the abstraction (different forks
  may use different DB libraries), and forces the relay package to depend on `@repo/db`.
- **Reuse `system_events` with a `published_at` column**: rejected. The two tables have different
  write cardinalities (audit log: one per significant event; outbox: one per side-effect to
  publish), different retention policies, and different access patterns. Merging them couples
  retention decisions across two distinct concerns.

## References

- `packages/db/src/schema/outbox.ts` — Drizzle table + types
- `packages/db/drizzle/0002_quiet_dark_beast.sql` — migration
- `packages/contracts/src/outbox.ts` — Zod row contract
- `packages/infrastructure/src/outbox.ts` — `OutboxRelay` port + memory adapter + `noopOutboxRelay`
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — `tenantId` carries through
- `docs/capabilities.md` — deferred-capabilities entry for "real outbox relay"
- Pattern background — Chris Richardson, "Pattern: Transactional outbox":
  <https://microservices.io/patterns/data/transactional-outbox.html>
