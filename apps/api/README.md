# apps/api — NestJS

## Purpose

REST API for the product. NestJS 11 on Node 24, ESM throughout.
Authenticated via Better Auth (mounted here in Pattern B), with shared
contracts validated through Zod and errors mapped to a single envelope.

## Stack

- NestJS 11 (`@nestjs/core`, `@nestjs/platform-express`)
- Better Auth via `@repo/auth-server`
- Drizzle + PostgreSQL via `@repo/db`
- Pino logging via `nestjs-pino`; secrets redacted by default
- `@nestjs/schedule` cron lane (`src/jobs/`); `cache-cleanup.job.ts`
  is the wiring template
- `@nestjs/throttler` global rate limit (100 req/min/IP). Per-route
  overrides via `@Throttle()` — see `notes.controller.ts` `create`
- OpenAPI/Swagger UI at `/docs`
- Liveness + readiness probes at `/health/live` and `/health/ready`
  (orchestrator-friendly)
- Prometheus scrape endpoint at `/metrics` via `prom-client` default
  Node + process metrics. `@SkipThrottle()` so scrapers don't eat
  the rate-limit budget. Restrict at the network layer.
- OpenTelemetry tracing via `@opentelemetry/sdk-node` +
  auto-instrumentations. Bootstrap lives in `src/telemetry.ts` and
  must be the first import of `main.ts`. Opt-in: SDK starts only
  when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, so local dev stays
  zero-overhead.

## Dev

```bash
pnpm dev:api                  # http://localhost:4000
```

The dev server uses `tsx watch` (`package.json` script). The OpenAPI UI
is available once boot finishes.

## Build / start

```bash
pnpm --filter @repo/api build
pnpm --filter @repo/api start # node dist/main.js
```

## Env

Validated by `loadApiEnv()` from `@repo/env/apps/api`, called from
`src/main.ts` (exits on failure). `BETTER_AUTH_SECRET` must be 32+
chars. Social SSO providers activate only when both `*_CLIENT_ID`
and `*_CLIENT_SECRET` are set. Document new variables in
`env/local/api.env.example` and the loader, then re-run
`pnpm env:check`.

## Adding a domain module

Mirror `src/notes/`:

1. Add Zod schemas to `packages/contracts/src/<entity>.ts`.
2. Add Drizzle tables to `packages/db/src/schema/<entity>.ts`.
3. Add NestJS service + controller under `apps/api/src/<entity>/`.
4. Add a typed client at `packages/clients/src/<entity>-client.ts`.
5. Register the module in `apps/api/src/app.module.ts`.

## Allowed dependencies

`@repo/auth`, `@repo/auth-server`, `@repo/contracts`, `@repo/db`,
`@repo/infrastructure`, `@repo/platform`, plus the NestJS ecosystem.

## Tests

```bash
pnpm --filter @repo/api test
```

Files: `src/env.test.ts`.
