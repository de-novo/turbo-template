# Changelog

This file tracks template-level changes that downstream forks may want to pull in. The format is
loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with sections grouped by
the milestone or phase that produced the change. Forks should track their own product changelog
separately; this one stays scoped to template baseline.

The template does not use Conventional Commits or Changesets — the commit body itself is the primary
record. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Unreleased

(no entries yet)

## v0.1.1 — 2026-04-27

Production-hardening patch. No breaking changes; every addition is either a new opt-in env var or a
stricter default that's safe to inherit. Container images are published as
`ghcr.io/de-novo/turbo-template-{api,web}:v0.1.1`.

### Added

- **Per-request access log middleware** (`apps/api/src/middleware/request-logger.middleware.ts`).
  One pino line per request with `method`, `path`, `status`, `latencyMs`, and `requestId` — joining
  the same stream as application logs (and rendering nicely under `pino-pretty`). Skips `/health/*`
  and `/metrics` so liveness probes and Prometheus scrapes don't bury real traffic. Status drives
  log level (2xx/3xx → info, 4xx → warn, 5xx → error).
- **HTTP request metrics** at `/metrics`: `http_request_duration_seconds` histogram (5ms→10s
  buckets) and `http_requests_total` counter, both labeled by `method`, `route`, `status`. Route
  uses Express's matched template (`req.route?.path`, falling back to `<unmatched>`) so cardinality
  stays bounded.
- **`pino-pretty` in dev**: `apps/api`'s `dev` script pipes JSON output through `pino-pretty` for
  colorized human-readable logs. Production deploys (`node dist/main.js`) keep structured JSON
  intact for log shippers.
- **Mermaid dependency-direction diagram** in README — replaces the ASCII tree. GitHub renders
  inline; same rules, harder to drift.
- **`CORS_ORIGINS`** env (`packages/env/src/apps/api.ts`): comma-separated allowlist. Required in
  production via `requireInProduction`; local dev defaults to localhost:{3000,3001,3100,3101} so
  `pnpm dev` keeps working without env tuning. Pairs with `credentials: true`.
- **Per-route auth rate limit**: Better Auth `rateLimit.customRules` caps `/sign-in/email` and
  `/sign-up/email` at 5 attempts per 15 min per IP. In-memory storage by default; multi-replica
  deploys should switch to `storage: "database"` (see `apps/api/src/auth/auth.ts` doc comment).
- **`EXPOSE_DOCS`** env: gate `/openapi.json` and `/docs` behind a flag (default `true` in dev).
  Production deploys typically set `false` so the API surface isn't published. `OpenApiController`
  throws `NOT_FOUND` (not `UNAUTHORIZED`) when disabled — doesn't signal that the route exists.
- **`SHUTDOWN_TIMEOUT_MS`** env (default 30 s): force-exit safety net for graceful shutdown.
- **`pnpm lint:fix` and `pnpm test:watch`** root scripts.

### Changed

- **Graceful shutdown order**: `httpServer.close()` first (drains keep-alive connections so probes
  route to another replica) → `app.close()` (Nest lifecycle hooks) → `dbClient.close()` +
  `observability.shutdown()`. Prior code called `app.close()` directly, leaving the http server
  accepting new connections during the drain. Wraps the whole thing in `SHUTDOWN_TIMEOUT_MS`.
- **`AppErrorFilter` translates Nest's `HttpException`** (incl. the default 404 for unmatched
  routes) into the `AppError` taxonomy so every error response uses the canonical
  `{ ok: false, error: { code, message } }` envelope. Previously these became `INTERNAL/500`.
- **Stack traces stripped from production logs**: `AppErrorFilter` only includes `exception.stack`
  in `details` when `APP_ENV !== "production"`. Removes internal-path leakage from prod log shippers
  without losing the dev debugging signal.
- **CORS default**: `cors: true` (Origin reflection) replaced with
  `{ origin: corsOrigin, credentials: true }`. Reflection paired poorly with credentialed requests.
- **CONTRIBUTING.md** Local setup uses `pnpm bootstrap` instead of manual `cp env/local/*`.
- **`apps/api/src/db/db.module.ts`**: empty `constructor()` removed (lint info
  `noUselessConstructor`).
- **`scripts/{bootstrap,rename-template.test}.mjs`**: string-concatenation `+ "\n"` switched to
  template literals (lint info `useTemplate`). `pnpm lint` now reports zero warnings AND zero infos,
  so future regressions surface immediately.

## v0.1.0 — 2026-04-27

First tagged template baseline. The repo is configured as a GitHub template (`is_template=true`);
fork via `gh repo create --template`, `npx degit`, or the GitHub UI. See
[README — Quick Start](./README.md#quick-start).

### Added

- **DB + Auth production path**: `packages/db/src/schema/auth.ts` (Better Auth tables for `pg`),
  Drizzle migration baseline at `packages/db/drizzle/`, `packages/db/src/seed.ts` + `pnpm db:seed`,
  `docker-compose.dev.yml` (Postgres 17 alpine, host:5433 → container:5432) +
  `pnpm dev:db / dev:db:logs / dev:db:stop / dev:db:reset`, and `apps/api/src/db/db.module.ts` DI
  provider for the shared `DatabaseClient`. Better Auth uses the Drizzle adapter when `DATABASE_URL`
  is set (production path) and falls back to the memory adapter otherwise. `/health/ready` actually
  probes the DB via `SELECT 1` when the client is configured.
- **API integration tests** (supertest): 5 tests for `/notes` against the in-memory module + 3 tests
  for the Better Auth runtime mount.
- **OpenAPI 3.1 + Scalar UI**: `GET /openapi.json` generated from `@repo/contracts` Zod schemas via
  Zod 4's built-in `z.toJSONSchema`, served by `OpenApiController`; Scalar UI mounted at
  `GET /docs`. ADR [0003](./docs/adr/0003-openapi-from-zod-contracts.md) records the choice.
- **Optional scheduled jobs** behind `JOBS_ENABLED=true`: `@nestjs/schedule` wired via
  `jobsModule(enabled)` factory; sample `HeartbeatJob` logs an info pulse every hour. Production
  guidance for leader-election lives in `env/README.md`.
- **API auth guard pattern** (embedded mode): `AuthModule` provides `AUTH_INSTANCE` to the rest of
  Nest's DI tree (replacing main.ts's standalone construction). `AuthenticatedGuard` +
  `@CurrentUser()` gate routes against the Better Auth session. Reference endpoint: `GET /me`. See
  recipe [protect-an-api-route](./docs/recipes/protect-an-api-route.md).
- **Web auth integration**: `/sign-in`, `/sign-up`, `/me` pages in `apps/web` use the Better Auth
  React client. Next.js rewrite proxies `/api/auth/*` and `/api/me` to `NEXT_PUBLIC_API_URL` so the
  browser sees same-origin (no CORS, no Domain= cookie quirks).
- **`pnpm bootstrap`** (`scripts/bootstrap.mjs` + 4 tests): preflight → install → idempotent copy of
  `env/local/*.env.example` to per-app dev locations. Used as the devcontainer's
  `postCreateCommand`.
- **`docs/recipes/`**: cookbook walkthroughs — add an API domain module, add an env key, add a
  scheduled job, switch the auth mode, protect an API route, generate a typed client SDK.
- **GitHub-template fork paths** documented in README (gh CLI, `npx degit`, UI).
- **Tailwind class regex** for `cn()` and `cva()` in `.vscode/settings.json`; devcontainer adds
  Docker-in-Docker so `pnpm dev:db` works inside the container.
- **`.github/PULL_REQUEST_TEMPLATE.md`**, `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`,
  `.github/CODEOWNERS`.
- **`scripts/preflight.mjs`** (`pnpm doctor`) — Node 24 / pnpm 10 / git checks.
- **`scripts/rename-template.test.mjs`** (`pnpm test:scripts`) covers `--help`, `--dry-run`,
  `--name`, `--slug`, `--scope`.
- **`apps/api/Dockerfile` HEALTHCHECK** against `/health/live`.

### Changed

- `@repo/env` `assertNoForeignKeys` ignores framework-internal keys (currently `VITE_USER_NODE_ENV`)
  so vitest's auto-loaded `.env` doesn't trip the strict guard.

### Removed

- `apps/api/src/app.controller.ts` (and its test) — `/health` moved into `HealthController`
  alongside `/health/live` + `/health/ready`. `/health` stays as an alias.

## Phase 6 (port from origin)

### Added

- GHCR Docker pipeline: `apps/{api,web}/Dockerfile` (multi-stage, `pnpm deploy --prod` for api, Next
  standalone for web), `.github/workflows/release-images.yml` (push to GHCR with build provenance +
  SBOM).
- `apps/web/public/.gitkeep` so the standalone bundle's COPY layer always succeeds.
- `output: "standalone"` and `outputFileTracingRoot` in `apps/web/next.config.ts`.

## Phase 5 (port from origin)

### Added

- `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`,
  `.dockerignore`, `.vscode/{settings,extensions}.json`, `packages/env/README.md`.

## Phase 4 (port from origin)

### Added

- Dependabot grouped weekly bumps (`.github/dependabot.yml`).
- Trivy + CodeQL scans on push, PR, and weekly schedule (`.github/workflows/security.yml`).
- CycloneDX SBOM on each release (`.github/workflows/sbom.yml`).
- syncpack drift gate (`.syncpackrc.json`, `pnpm syncpack:check`).
- Production license allow-list (`pnpm licenses:check`).
- `pnpm audit --prod --audit-level=high` in CI.
- `pnpm.overrides` pinning `multer >=2.1.1` and `path-to-regexp >=8.4.0` to clear known transitive
  vulns.

## Phase 3 (port from origin)

### Added

- `apps/api` `/health/live` + `/health/ready` (`@SkipThrottle()`, DB-aware readiness).
- `apps/api` Prometheus `/metrics` via `prom-client` (skip-throttled).
- Per-IP rate limiting via `@nestjs/throttler` (100 req/min/IP global, `APP_GUARD`).
- Web security headers in `apps/web/next.config.ts headers()` (CSP intentionally omitted).
- `apps/api/src/pipes/zod-validation.pipe.ts` (Zod-backed, opt-in per route) instead of
  `class-validator`-based `ValidationPipe`.

## M4 — Observability baseline

### Added

- pino default `Logger` in `@repo/platform` (`createPinoLogger`).
- `LoggerContext` propagation through `AsyncLocalStorage` via `withLoggerContext`.
- `errorCodeToHttpStatus` (and inverse) over all 8 codes in `@repo/contracts/errors`.
- Opt-in `initOpenTelemetry` in `@repo/infrastructure` — returns `null` and a no-op handle when
  `OTEL_EXPORTER_OTLP_ENDPOINT` is unset.
- `apps/api` global `AppErrorFilter` (`APP_FILTER`) and `requestIdMiddleware` (function-style via
  `app.use()`).

## M3 — Testing baseline

### Added

- `packages/testing` shared Vitest node/jsdom configs.
- Per-package smoke tests across the workspace.
- `apps/mobile` jest-expo (the only exception).
- `apps/web` Playwright chromium smoke (`pnpm test:e2e`, opt-in).
- Root `pnpm test` → `turbo run test`; CI gains a `test` job.

## M0–M2

See [memory/roadmap_status.md](./memory/roadmap_status.md) for boot verification, CI lane, and
surface pruning details.
