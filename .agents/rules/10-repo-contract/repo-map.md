---
id: repo-contract.repo-map
name: Repo Map
description: Locate the main application and package surfaces before editing.
summary: >
  Apply this rule before editing application or package code. It points agents to the canonical
  source locations for API, web, desktop, mobile, MFE, env, observability, logging, and activation
  ports.
status: active
priority: 12
severity: medium
scope:
  match:
    any:
      - fileGlob: apps/**
      - fileGlob: packages/**
      - fileGlob: docs/**
      - userTrigger: where
      - userTrigger: module
      - userTrigger: surface
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Repo Map

## API (`apps/api`)

- Request scope: `apps/api/src/middleware/` and `apps/api/src/logger.ts`.
- Global error envelope: `apps/api/src/filters/app-error.filter.ts` ->
  `@repo/platform/toPublicError` plus `errorCodeToHttpStatus`.
- Health probes: `apps/api/src/health/health.controller.ts` (`/health/live`, `/health/ready`).
- Prometheus scrape: `apps/api/src/metrics/metrics.controller.ts` (`/metrics`).
- API env DI: `apps/api/src/api-env.module.ts` provides `loadApiEnv()` via `API_ENV` token.
- Better Auth runtime mount: `apps/api/src/auth/auth.ts`; Express-level mount in
  `apps/api/src/main.ts`.
- DB client DI: `apps/api/src/db/db.module.ts` provides `DatabaseClient` or `null` via
  `DATABASE_CLIENT`.
- Reference domain module: `apps/api/src/notes/`; contract lives in `@repo/contracts/notes`.

## Web (`apps/web`)

- App Router root: `apps/web/src/app/{layout,page,providers}.tsx`.
- Client-only error boundary: `apps/web/src/components/error-boundary.tsx`.
- E2E spec: `apps/web/e2e/`; Playwright config: `apps/web/playwright.config.ts`.

## Desktop / Mobile / MFE

- Desktop: `apps/desktop/src/main.tsx` (Vite + Tauri shell).
- Mobile: `apps/mobile/app/{_layout,index}.tsx` plus `apps/mobile/eas.json`.
- MFE host: `apps/mfe-host/src/main.tsx`.
- MFE dashboard remote: `apps/mfe-dashboard/src/register.tsx`.

## Cross-Cutting Packages

- OpenTelemetry: `@repo/infrastructure` `initOpenTelemetry()`.
- Logger + ALS context: `@repo/platform` `createPinoLogger()` and `withLoggerContext()`.
- Error taxonomy: `@repo/contracts/errorCodeSchema` plus `@repo/platform/errorCodeToHttpStatus`.
- Env contracts: `@repo/env/apps/<name>` per-app loaders; examples in `env/{local,production}/`.
- Test harness: `@repo/testing/vitest/{node,jsdom}` shared configs.
- Runtime activation ports: `@repo/infrastructure`; app-side DI tokens live in `apps/api`.
