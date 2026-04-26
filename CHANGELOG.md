# Changelog

This file tracks template-level changes that downstream forks may want to pull in. The format is
loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) with sections grouped by
the milestone or phase that produced the change. Forks should track their own product changelog
separately; this one stays scoped to template baseline.

The template does not use Conventional Commits or Changesets — the commit body itself is the primary
record. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Unreleased

### Added

- `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/{bug_report,feature_request}.md`, and
  `.github/CODEOWNERS` so PRs and issues come pre-shaped to the structured-commit convention.
- `scripts/preflight.mjs` (`pnpm doctor`) — checks Node 24 / pnpm 10 / git presence before
  `pnpm install` errors with a confusing diagnostic.
- `scripts/rename-template.test.mjs` (`pnpm test:scripts`) — protects the rename script from silent
  regressions across `--help`, `--dry-run`, `--name`, `--slug`, and `--scope`.
- `.devcontainer/devcontainer.json` — VS Code Remote Containers one-click setup with Node 24, pnpm,
  frozen-lockfile install, preflight on attach, and forwarded dev ports.
- `apps/api/Dockerfile` HEALTHCHECK against `/health/live` so `docker run` (without Kubernetes)
  marks the container unhealthy when the API is not responding.

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
