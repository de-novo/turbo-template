# @repo/infrastructure

## Purpose

Effect-backed adapter interfaces for cache, events, and health checks. The
template ships in-memory and noop implementations so apps compile without
live Redis/Kafka/etc. Real adapters slot in once the deployment target is
known.

## Public surface

Re-exports from `src/index.ts`:

- `CacheStore`, `createMemoryCache()` — get/set/delete returning Effect.
- `EventPublisher`, `EventConsumer<T>`, `noopEventPublisher` — Kafka-style
  publish/consume contract.
- `HealthCheck`, `HealthStatus` (`ok | degraded | down`),
  `healthy(name)` constructor.

## Allowed dependencies

- Imports: `@repo/contracts`, `@repo/platform`, `effect`.
- Imported by: services that need cache or eventing (api by default).

## Usage

```ts
import { createMemoryCache, healthy } from "@repo/infrastructure";
import { Effect } from "effect";

const cache = createMemoryCache();
await Effect.runPromise(cache.set("k", "v"));

const dbHealth = healthy("postgres");
```

## Tests

```bash
pnpm --filter @repo/infrastructure test
```

Files: `src/cache.test.ts`.

## Day-one scope

Per `docs/template-strategy.md`: do not add real Redis/Kafka clients
before the env contracts and usage patterns are known. Replace the noop /
memory implementations as the product matures.
