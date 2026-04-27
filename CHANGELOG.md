# Changelog

This file tracks template-level changes that downstream forks may want to pull in. The format is
loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with sections grouped by
the milestone or phase that produced the change. Forks should track their own product changelog
separately; this one stays scoped to template baseline.

The template does not use Conventional Commits or Changesets — the commit body itself is the primary
record. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Unreleased

(no entries yet)

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
