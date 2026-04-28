# 0007 — Job queue contract, backend deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Three different "later" patterns surface in real products and are easy to conflate:

1. **Cron / scheduled** — fires on a wall-clock schedule. Already covered by `@nestjs/schedule` and
   the `JOBS_ENABLED` lane in `apps/api/src/jobs/`.
2. **Outbox** — publishes already-decided messages from a transactional staging table. Covered by
   ADR [0005 — Outbox contract](./0005-outbox-contract.md). The relay is "publish once, mark done."
   There is no retry budget per message beyond "did the publish succeed?"
3. **Job queue** — demand-driven deferred _work_. The application enqueues "resize this image",
   "send this welcome email at 09:00", "import this CSV"; a worker pool claims and executes. Each
   job has its own retry budget, scheduling, idempotency, and outcome.

(1) and (2) are shipped. (3) was missing — and is the broadest of the three to pick a backend for.
BullMQ wants Redis; Inngest is hosted; SQS needs AWS; Cloud Tasks needs GCP; pg-boss reuses
Postgres. Each carries different ops, retries, and observability semantics. ADR
[0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) says: ship the contract, defer
the backend.

## Decision

Ship the job queue contract with a memory adapter; real backends plug in by implementing `JobQueue`.

- **Schema** — `@repo/contracts/job.ts` exports `jobDescriptorSchema` (producer-side: `name`,
  `payload`, optional `idempotencyKey`, `scheduledFor`, `maxAttempts` default 3, `tenantId`),
  `jobRecordSchema` (queue-side: descriptor + `id`, `status`, `attempt`, `enqueuedAt`, optional
  `lastError`), `jobStatusSchema` (`pending` / `running` / `succeeded` / `failed`).
- **Port** — `@repo/infrastructure/queue.ts` exports `JobQueue` with five Effect-typed methods:
  `enqueue`, `claimNext` (returns `null` when no ready work), `ack`, `nack(id, reason)`,
  `sizeByStatus`. The port is worker-driven: workers poll `claimNext`, the queue handles attempt
  accounting, deferral, and retry/fail transitions.
- **Adapters** —
  - `noopJobQueue` — accepts enqueue silently, never produces work. Solo default; the lane is inert
    until a real worker is wired.
  - `createMemoryJobQueue()` — in-process Map-backed implementation. Honors `idempotencyKey`
    (dedupes against in-flight or completed jobs with the same key), `scheduledFor` (skips
    future-dated until the clock catches up), and `maxAttempts` (`nack` past the limit flips to
    `failed`). Sufficient for tests and tiny single-process deploys.

`enqueue` lives on the port (unlike `OutboxRelay.enqueue`, which is _not_ on the port) because job
enqueue is **not** transactional with any specific DB write — a queue is a separate consistency
boundary, and de-duplication via `idempotencyKey` is the recovery story for "I'm not sure if my last
enqueue went through."

## Consequences

- **Benefits**:
  - Application code that writes
    `queue.enqueue({ name: "user.welcome.email", payload, idempotencyKey })` lands a stable shape on
    day one. Swapping `noopJobQueue` for BullMQ / Inngest / SQS / pg-boss is a wiring change.
  - Tests for handlers that produce jobs can use `createMemoryJobQueue` and assert on `claimNext` +
    `ack` outcomes — no Redis needed in CI.
  - `tenantId` flows through the descriptor (per ADR
    [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md)), so per-tenant fairness,
    dead-letter scoping, and workload labels work without retrofitting.
  - Distinct from outbox: the contracts model two genuinely different failure modes (publish-or-not
    vs. work-and-retry), so consumers don't end up overloading one for the other.
- **Costs**:
  - The memory adapter does **not** implement workers. It models the queue's state machine (enqueue
    / claim / ack / nack / dedup / schedule); polling, concurrency, and back-pressure live in the
    consumer. A real backend's worker ergonomics (BullMQ `Worker`, Inngest function decorator)
    replace any in-house polling loop a fork might write.
  - `maxAttempts` is the only retry knob in the contract. Backoff strategy, jitter, and dead-letter
    routing are backend-specific and intentionally not normalized here.
- **Risks / open questions**:
  - The relationship between `JobQueue` and `OutboxRelay` is conceptual (both produce work to be
    done later). A consumer wiring BullMQ for both simultaneously should reuse one Redis connection
    but keep the two ports separate so the failure-and-retry semantics don't conflate.
  - `scheduledFor` is wall-clock ISO. A backend that interprets it as "monotonic offset" instead
    would diverge subtly; the recipe (TODO) will document the wall-clock contract.

## Alternatives considered

- **Reuse `OutboxRelay` for both event publishing and job execution**: rejected. Conflates "publish
  a message" with "execute work and report outcome." Outbox has no per-message retry budget; jobs
  need one. Outbox is at-least-once forward; jobs need exactly-once ack.
- **Reuse `@nestjs/schedule` for all deferred work**: rejected. Cron is time-driven; jobs are
  demand-driven. A welcome email triggered by user signup belongs in a queue, not a cron schedule.
- **Ship BullMQ as the default**: rejected per ADR 0001. Forces Redis on every fork, even forks that
  would prefer Inngest or SQS or in-process workers.
- **Ship a Postgres-backed `pg-boss` default**: tempting because the template already mandates
  Postgres, but rejected for the same reason — it picks one of several reasonable backends and
  forces forks that prefer a managed queue (Inngest, SQS, Cloud Tasks) to undo a choice they didn't
  make.

## References

- `packages/contracts/src/job.ts` — schemas + types
- `packages/infrastructure/src/queue.ts` — `JobQueue` port + memory + noop
- `apps/api/src/jobs/` — existing `@nestjs/schedule` cron lane (separate concern)
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — `tenantId` carries through
- ADR [0005 — Outbox contract](./0005-outbox-contract.md) — distinct concern (publish vs. work)
