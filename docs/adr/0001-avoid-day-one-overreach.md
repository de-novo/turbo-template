# 0001 — Avoid day-one overreach

- **Status**: Accepted
- **Date**: 2026-04-26

## Context

A starter template can either ship every imaginable subsystem (Redis, Kafka, observability stack,
e2e harness, queue, email, push) on day one, or ship empty interfaces with explicit gaps and let
products fill them in. Shipping everything makes the template heavy and biased: a fork that doesn't
use Kafka inherits a real Kafka client, sample topics, and a config they have to delete; a fork that
uses Inngest instead of BullMQ has to rip out the wrong queue first.

Empty interfaces have the opposite failure mode: a contributor reads the README, sees
`@repo/infrastructure`, and writes a real Redis adapter before any product has chosen a cache layer.
The premature adapter then dictates env shape, deploy assumptions, and dependency versions for
everyone downstream.

## Decision

Ship interfaces + memory / noop adapters in `@repo/infrastructure`. Do not ship a real Redis, Kafka,
queue, observability collector, e2e against a third-party provider, or analytics adapter until a
product makes the choice and there is a real consumer.

OpenTelemetry is the one exception: the SDK init helper is wired but **opt-in** —
`initOpenTelemetry()` returns `null` when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, so a fresh clone
boots without an OTel collector dependency.

## Consequences

- **Benefits**: forks pick their own infra without removing the template's choice first. The
  template stays small and biased only toward the language/runtime/tooling baseline. Memory adapters
  in `@repo/infrastructure` show the integration shape (Effect-backed ports, error mapping,
  lifecycle) without preempting the technology choice.
- **Costs**: a fork using BullMQ has to write the BullMQ adapter themselves. The "deferred" list (in
  [docs/capabilities.md](../capabilities.md)) must stay current — every capability re-add must
  remove its deferred entry in the same commit.
- **Risks / open questions**: contributors may try to add real adapters "just for the demo." Reject
  those PRs; point at this ADR.

## Alternatives considered

- **Ship a real Redis client by default**: rejected — the template forces an env shape (`REDIS_URL`)
  that a Memcached or in-process product would have to undo.
- **Ship every adapter behind a flag**: rejected — flags multiply surface area, every flag needs
  tests, and the deferred adapters rot before a real consumer arrives.
- **Ship nothing — empty package**: rejected — contributors need a reference to copy. Memory / noop
  implementations carry no env or deploy assumptions but still demonstrate the integration shape.

## References

- `docs/template-strategy.md` "Avoid day-one overreach" section
- `docs/capabilities.md` overview of what ships vs. what is deferred
- `packages/infrastructure/src/{cache,events,health,observability}.ts`
