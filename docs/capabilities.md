# What this template enables

Last checked: 2026-04-27

Single map of every surface, package, and operational lane the template ships. Detailed docs are
linked at the bottom of each section.

## Application surfaces

Six runnable surfaces ship buildable on day one.

| App                  | Stack                                                                                                                                    | Port | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`           | Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query, Zustand                                                                   | 3000 | Standalone build output for slim Docker images. `pnpm --filter @repo/web analyze` runs `@next/bundle-analyzer` behind `ANALYZE=true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `apps/api`           | NestJS 11 (ESM, Express 5 adapter), pino, `@nestjs/throttler`, `@nestjs/schedule`, `prom-client`, `@opentelemetry/sdk-node`, Better Auth | 4000 | `/health/live` + `/health/ready`, `/metrics` (Prometheus — default Node metrics + HTTP request histogram + counter, labeled by route template), `/openapi.json` + `/docs` (Scalar UI, generated from `@repo/contracts`, opt-out via `EXPOSE_DOCS=false`), `/api/auth/*` (Better Auth, memory or Drizzle adapter; per-route rate limit caps sign-in/sign-up at 5 / 15 min / IP), CORS via env-driven `CORS_ORIGINS` allowlist, per-request access log middleware, graceful shutdown drains in-flight requests (`SHUTDOWN_TIMEOUT_MS`), OTel opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT`, global 100 req/min/IP throttle, optional scheduled jobs behind `JOBS_ENABLED=true`. Reference `notes` module shows the contract → controller → service → test loop; `me` module shows the protected-route pattern. |
| `apps/desktop`       | Vite + React 19, Tauri 2                                                                                                                 | 3001 | `pnpm dev:desktop` (browser shell), `dev:native` (Tauri devtools).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `apps/mobile`        | Expo SDK 55 + React Native 0.83, Expo Router                                                                                             | 8081 | iOS, Android, and web export from one source. `apps/mobile/eas.json` ships dev/preview/production EAS Build profiles.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `apps/mfe-host`      | Vite + React, manifest-driven runtime composition                                                                                        | 3100 | Loads remotes via fetch + dynamic import + custom element.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `apps/mfe-dashboard` | Vite library mode, shadow DOM custom element                                                                                             | 3101 | Canonical MFE remote example.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Tauri desktop and Expo mobile package via their own toolchains and are not Dockerized. Web and api
are. See [docs/deployment.md](./deployment.md).

## Shared packages

All `@repo/*` packages are `private: true`. Import direction is documented in
[docs/technical-stack.md](./technical-stack.md) and enforced by example in each package's source.

| Package                | Purpose                                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `@repo/auth`           | Session, identity, permission, role Zod contracts (no runtime).                                                       |
| `@repo/clients`        | `createFetchClient` reference plus contract-driven decoding.                                                          |
| `@repo/config`         | `projectConfig` from JSON; future home for shared tsconfig presets.                                                   |
| `@repo/contracts`      | API envelope, error schema, ids, pagination, domain event shape, reference `notes` Zod schemas.                       |
| `@repo/db`             | Drizzle schema (system events) + client factory; DB-aware health helper.                                              |
| `@repo/design-system`  | `AppShell`, `EmptyState`, `StatusBadge`, `designTokens`.                                                              |
| `@repo/env`            | Per-app env loaders with foreign-key + secret guards.                                                                 |
| `@repo/infrastructure` | Effect-backed cache / events / health adapters (in-memory + noop) + OTel init.                                        |
| `@repo/mfe`            | Manifest schema + lifecycle event helpers for the MFE lane.                                                           |
| `@repo/platform`       | `AppError` taxonomy, pino `Logger` factory, `LoggerContext` ALS, result helpers, feature-flag registry, time helpers. |
| `@repo/testing`        | Shared Vitest node/jsdom configs (`@repo/testing/vitest/{node,jsdom}`).                                               |
| `@repo/ui-primitives`  | shadcn-style primitives + `cn()` (tailwind-merge).                                                                    |

## Authentication

Better Auth contract lives in `@repo/auth` (session/identity/permission/strategy schemas). The
runtime mount point is selectable via `AUTH_MODE` and `AUTH_TOPOLOGY` env:

- **better-auth-embedded** (default) — auth in the API or web app itself.
- **external-oidc** — external IdP owns login; this repo validates issuer/audience.
- **sso-gateway** — edge gateway owns SSO; apps consume forwarded claims.
- **central-auth-service** — internal auth-service for MSA topologies.

Run `pnpm template:auth` to switch. The auth env keys (`AUTH_MODE`, `AUTH_TOPOLOGY`,
`AUTH_ISSUER_URL`, `AUTH_SERVICE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`) are documented in
[README.md](../README.md#auth-strategy-selection) and the per-app loader at
`packages/env/src/apps/api.ts`. Concrete wiring per non-default mode:
[external-oidc](./auth-recipes/external-oidc.md), [sso-gateway](./auth-recipes/sso-gateway.md),
[central-auth-service](./auth-recipes/central-auth-service.md).

## Operational lanes

| Lane             | Where                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Logging          | pino + `withLoggerContext` (ALS) in `@repo/platform`. Emits NDJSON.                           |
| Tracing          | `initOpenTelemetry` in `@repo/infrastructure`; opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT`.      |
| Metrics          | `prom-client` default metrics on `apps/api/GET /metrics`.                                     |
| Rate limiting    | `@nestjs/throttler` global guard, 100 req/min/IP. `@SkipThrottle()` on probes/metrics.        |
| Health probes    | `apps/api/GET /health/live` + `/health/ready`.                                                |
| Web headers      | Conservative defaults via `apps/web/next.config.ts headers()` (CSP intentionally omitted).    |
| Container images | `apps/api/Dockerfile` + `apps/web/Dockerfile`, multi-stage. `release-images.yml` → GHCR.      |
| GitOps secrets   | `ops/gitops` SOPS + age + KSOPS lane (opt-in).                                                |
| CI security      | pnpm audit (high+) gate, license allow-list, syncpack drift, Trivy + CodeQL, weekly schedule. |
| SBOM             | CycloneDX on each release via `.github/workflows/sbom.yml`.                                   |
| Dependency bumps | Dependabot grouped weekly bumps; monthly Docker base-image bumps.                             |

## Testing baseline

- Vitest is the default engine (`@repo/testing/vitest/{node,jsdom}` shared configs).
- jest-expo is the only exception, scoped to `apps/mobile`.
- Playwright runs the web E2E smoke; opt-in via `pnpm test:e2e` (not part of `pnpm test`).
- Per-package `test:coverage` script (where present) emits informational coverage; no coverage gate
  by design.
- CI runs `pnpm test` in a separate job after `pnpm check + pnpm build` pass.

## Deferred capabilities

The following are intentionally not shipped on day one and require a deliberate consumer choice to
add. See ADR [0001 — Avoid day-one overreach](./adr/0001-avoid-day-one-overreach.md) for the
rationale.

- **Real Redis / Kafka / queue / email / push providers.** `@repo/infrastructure` ships memory +
  noop adapters only.
- **`@opentelemetry/auto-instrumentations-node`.** OTel SDK is wired but auto-patching every
  transport is opt-in.
- **`docker-compose.prod.yml` with bundled Postgres.** Production deploys go through GHCR and a
  managed DB; local dev runs `apps/api` against an externally-managed Postgres.
- **`@nestjs/swagger` decorator-driven docs.** Decorator-based generation is intentionally rejected;
  the API publishes OpenAPI 3.1 from `@repo/contracts` Zod schemas instead (see ADR
  [0003 — OpenAPI from Zod contracts](./adr/0003-openapi-from-zod-contracts.md)).
- **next-intl / i18n routing.** Single-locale by default; the `[locale]/` segment restructure is a
  deliberate fork choice.
- **Theme provider (`next-themes`) and form convention (`react-hook-form`).** The first product UI
  decides those.
- **Changesets / Husky / lint-staged / commitlint.** This repo uses a structured commit body
  (Constraint / Rejected / Confidence / Scope-risk / Directive / Tested / Not-tested) rather than
  Conventional Commits; see [CONTRIBUTING.md](../CONTRIBUTING.md).

## Where to start reading

- [README.md](../README.md) — top-level orientation.
- [docs/recipes/](./recipes/) — cookbook walkthroughs for common changes (add a domain module, add
  an env key, add a scheduled job, switch the auth mode, generate a client SDK).
- [docs/template-strategy.md](./template-strategy.md) — naming, scope, what to keep stable.
- [docs/technical-stack.md](./technical-stack.md) — versions, language standards, package ownership.
- [docs/secret-management.md](./secret-management.md) — env contract + GitOps secret lane.
- [docs/deployment.md](./deployment.md) — Dockerfile + GHCR pipeline shape.
- [docs/desktop-signing.md](./desktop-signing.md) — per-platform Tauri signing.
- [AGENTS.md](../AGENTS.md) — guidance for AI coding agents working in this repo.
