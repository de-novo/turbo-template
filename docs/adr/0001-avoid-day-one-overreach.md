# 0001 — Avoid day-one overreach

- **Status**: Accepted
- **Date**: 2026-04-25

## Context

A starter template can either ship every imaginable subsystem (Redis,
Kafka, observability stack, e2e harness, queue, email, push) on day
one, or ship empty interfaces with explicit gaps and let products fill
them in. Shipping everything makes the template heavy and biased: a
fork that doesn't use Kafka inherits a real Kafka client, sample
topics, and a config they have to delete; a fork that uses
Inngest instead of BullMQ has to rip out the wrong queue first.

Empty interfaces have the opposite failure mode: a contributor reads
the README, sees `@repo/infrastructure`, and writes a real Redis
adapter before any product has chosen a cache layer. The premature
adapter then dictates env shape, deploy assumptions, and dependency
versions for everyone downstream.

## Decision

Ship interfaces + memory / noop adapters in `@repo/infrastructure`,
plus reference modules (`apps/api/src/notes`, `apps/api/src/jobs/cache-cleanup.job.ts`)
that demonstrate the wiring without binding to a real provider. Do
not ship a real Redis, Kafka, queue, observability, e2e, or analytics
adapter until a product makes the choice and there is a real
consumer.

The full list of intentionally-deferred items lives in
[docs/capabilities.md](../capabilities.md#out-of-scope) as the "Out
of scope" section so it is grep-able and visible to new contributors.

## Consequences

- **Benefits**: forks pick their own infra without removing the
  template's choice first. The template stays small and biased only
  toward the language/runtime/tooling baseline. Reference modules
  show the wiring shape (decorators, ports, providers) without
  preempting the technology choice.
- **Costs**: a fork using BullMQ has to write the BullMQ adapter
  themselves. The "Out of scope" list must stay current — every
  capability re-add must remove its OOS entry in the same PR.
- **Risks / open questions**: contributors may try to add real
  adapters "just for the demo." Reject those PRs; point at this
  ADR.

## Alternatives considered

- **Ship a real Redis client by default**: rejected — the template
  forces an env shape (`REDIS_URL`) that a Memcached or in-process
  product would have to undo.
- **Ship every adapter behind a flag**: rejected — flags multiply
  surface area, every flag needs tests, and the deferred adapters
  rot before a real consumer arrives.
- **Ship nothing — empty package**: rejected — contributors need a
  reference to copy. Memory / noop implementations carry no env or
  deploy assumptions but still demonstrate the integration shape.

## References

- `docs/template-strategy.md` "Avoid day-one overreach" section
- `docs/capabilities.md` "Out of scope" list
- `packages/infrastructure/src/{cache,events,health}.ts`
- `apps/api/src/jobs/cache-cleanup.job.ts`
