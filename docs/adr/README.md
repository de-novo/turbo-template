# Architecture Decision Records

This directory holds the lightweight ADRs (Architecture Decision Records) that capture decisions
whose rationale is not obvious from the code alone. The format is intentionally compact — Michael
Nygard style — so the cost of writing one is low.

## When to add an ADR

Open an ADR for any decision that:

- Crosses package or app boundaries.
- Constrains a future change (e.g. "do not introduce X").
- Is non-obvious to a contributor reading the code five months later.
- Has been argued and decided — write down the rejected options and why, not just the picked one.

Skip an ADR for:

- Routine refactors, bug fixes, dep bumps, doc edits.
- Patterns already documented in `docs/template-strategy.md`, `docs/technical-stack.md`, or a
  package-level README.

## How

1. Copy `_template.md` to `NNNN-short-kebab-title.md` where `NNNN` is the next four-digit number.
   For the next ADR after `0002`, that is:

   ```bash
   cp docs/adr/_template.md docs/adr/0003-short-kebab-title.md
   ```

2. Fill in the sections. Keep each section short — bullets are fine.
3. Update the index below.
4. Commit with `Constraint:` / `Rejected:` / etc. body documenting the change (this repo does not
   use Conventional Commits — see [CONTRIBUTING.md](../../CONTRIBUTING.md)).
5. Open the PR. The ADR is the durable artifact; the PR description can stay short.

## Statuses

- **Proposed** — open for discussion.
- **Accepted** — the decision is in effect; code reflects it.
- **Superseded by NNNN** — replaced by a later ADR. Keep the file for historical context; do not
  delete.
- **Rejected** — recorded so we don't relitigate.

## Index

- [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) · Accepted
- [0002 — Per-app env loaders with foreign-key guards](./0002-per-app-env-loaders.md) · Accepted
- [0003 — OpenAPI from Zod contracts via z.toJSONSchema](./0003-openapi-from-zod-contracts.md) ·
  Superseded by 0011
- [0004 — Multi-tenancy contract, resolution deferred](./0004-multi-tenancy-contract.md) · Accepted
- [0005 — Outbox contract, relay deferred](./0005-outbox-contract.md) · Accepted
- [0006 — Policy port, engine deferred](./0006-policy-port.md) · Accepted
- [0007 — Job queue contract, backend deferred](./0007-job-queue-contract.md) · Accepted
- [0008 — Notifier contract, provider deferred](./0008-notifier-contract.md) · Accepted
- [0009 — Object storage contract, provider deferred](./0009-object-storage-contract.md) · Accepted
- [0010 — Audit sink contract, persistence deferred](./0010-audit-sink-contract.md) · Accepted
- [0011 — API documentation in Markdown, OpenAPI surface removed](./0011-api-docs-in-markdown.md) ·
  Accepted
- [0012 — API versioning: defer until the first breaking change](./0012-api-versioning.md) ·
  Accepted
- [0013 — Tenant middleware: global mount, resolver-pluggable, noop default](./0013-tenant-middleware-wiring.md)
  · Accepted
