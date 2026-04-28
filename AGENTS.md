# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Cline, Copilot Workspace, etc.) working in this
repository.

## What this repository is

A TypeScript Turborepo monorepo template that downstream products fork via `pnpm template:rename`.
Six applications (`web`, `api`, `desktop`, `mobile`, `mfe-host`, `mfe-dashboard`) and twelve
`@repo/*` packages (`auth`, `clients`, `config`, `contracts`, `db`, `design-system`, `env`,
`infrastructure`, `mfe`, `platform`, `testing`, `ui-primitives`) on Node 24 / pnpm 10 / Turborepo
2.9 / Biome 2 / TypeScript 6.

Start with [docs/capabilities.md](./docs/capabilities.md) for the surface map,
[docs/template-strategy.md](./docs/template-strategy.md) for naming/scope decisions, and
[docs/technical-stack.md](./docs/technical-stack.md) for stack-level rationale.

## Run commands

Use these instead of inventing alternatives:

```bash
pnpm install
pnpm dev                  # all surfaces
pnpm dev:web | dev:api | dev:desktop | dev:mobile | dev:mfe | dev:mfe-host | dev:mfe-dashboard
pnpm check                # biome lint + tsconfig:check + typecheck + format:check + env:check + design:lint
pnpm env:check            # validate env/*/*.env.example
pnpm test                 # turbo run test (vitest + jest-expo for mobile)
pnpm test:e2e             # Playwright web smoke (opt-in, not in pnpm test)
pnpm build                # turbo build
pnpm db:generate | db:migrate | db:studio
pnpm template:rename --name "..." --slug "..." [--scope @acme]
pnpm template:auth        # select AUTH_MODE / AUTH_TOPOLOGY
pnpm template:surfaces --keep web,api  # prune unused apps from a fork
pnpm syncpack:check       # workspace catalog drift gate
pnpm licenses:check       # production license allow-list
```

CI (`.github/workflows/ci.yml`) runs install → audit (high+) → licenses → syncpack → check → build,
then a separate `test` job. `.github/workflows/security.yml` runs Trivy + CodeQL on push, PR, and
weekly schedule.

## Hard rules

- **Do not amend or force-push.** Always create a new commit.
- **Conventional commits are NOT used.** This repo uses a structured commit body: `Constraint: ...`
  / `Rejected: ... | reason` / `Confidence: high|med|low` / `Scope-risk: narrow|medium|broad` /
  `Directive: ...` / `Tested: ...` / `Not-tested: ...`. See `git log -1 --format=fuller` for the
  most recent example.
- **Tests live alongside source as `*.test.ts` or `*.spec.ts` (also `.tsx`).** Each package's
  `tsconfig.json` excludes them so `tsc` does not emit test files into `dist/`. Don't add test files
  anywhere `tsc` would emit them.
- **Do not import from `process.env` directly** outside the per-app env adapter
  (`apps/*/src/env.ts`). Use `@repo/env/apps/<name>` loaders.
- **Activation recipes must be copy-safe and follow the same env contract as source code.** Provider
  examples should inject `API_ENV` / `ApiEnvModule` or use the relevant `@repo/env/apps/<name>`
  loader; do not teach forks to bypass env validation with broad `process.env` reads.
- **No new `tsconfig.references` arrays.** `pnpm tsconfig:check` will reject them; Turborepo derives
  the dependency graph from `package.json` `workspace:*`.
- **Foreign env prefixes are forbidden by the loader.** API rejects `NEXT_PUBLIC_*`, `VITE_*`,
  `EXPO_PUBLIC_*`. Web rejects `VITE_*` and `EXPO_PUBLIC_*`. Etc.
- **`@repo/contracts` stays runtime-light.** No NestJS, Next.js, browser-only APIs, or ORM clients
  in there.
- **`packages/db/src/env.ts` does not exist.** `DATABASE_URL` is owned by `@repo/env/apps/api` only.

## Where things live

API (`apps/api`):

- Request scope (request id, ALS-backed logger context): `apps/api/src/middleware/` and
  `apps/api/src/logger.ts`.
- Global error envelope: `apps/api/src/filters/app-error.filter.ts` →
  `@repo/platform/toPublicError` + `errorCodeToHttpStatus`.
- Health probes: `apps/api/src/health/health.controller.ts` (`/health/live`, `/health/ready`).
- Prometheus scrape: `apps/api/src/metrics/metrics.controller.ts` (`/metrics`).
- Rate limiting: `@nestjs/throttler` registered globally in `apps/api/src/app.module.ts`;
  `@SkipThrottle()` on probes and metrics.
- API env DI: `apps/api/src/api-env.module.ts` provides `loadApiEnv()` via `API_ENV` token.
- Better Auth runtime mount (when `AUTH_MODE=better-auth-embedded`): `apps/api/src/auth/auth.ts`
  - Express-level mount in `apps/api/src/main.ts`. Drizzle adapter when `DATABASE_URL` is set
    (production path), in-process memory adapter otherwise (solo / demo).
- DB client DI: `apps/api/src/db/db.module.ts` provides a `DatabaseClient` (or `null` when
  `DATABASE_URL` is unset) via the `DATABASE_CLIENT` token.
- Reference domain module: `apps/api/src/notes/` (controller + service + test) — copy this shape for
  new domain modules. The contract lives in `@repo/contracts/notes`.

Web (`apps/web`):

- App Router root: `apps/web/src/app/{layout,page,providers}.tsx`.
- Client-only error boundary: `apps/web/src/components/error-boundary.tsx` (uses duck-typed
  `AppError` shape because `@repo/platform` cannot be bundled for the client — see commit
  `33af446`).
- E2E spec: `apps/web/e2e/`. Playwright config in `apps/web/playwright.config.ts`.

Desktop / Mobile / MFE:

- `apps/desktop/src/main.tsx` (Vite + Tauri shell).
- `apps/mobile/app/{_layout,index}.tsx` + `apps/mobile/eas.json` (EAS Build profiles).
- `apps/mfe-host/src/main.tsx` (manifest-driven host) and `apps/mfe-dashboard/src/register.tsx`
  (custom-element remote).

Cross-cutting (`packages/*`):

- OpenTelemetry: `@repo/infrastructure` `initOpenTelemetry()`; opt-in via
  `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Logger + ALS context: `@repo/platform` `createPinoLogger()` + `withLoggerContext()`.
- Error taxonomy: `@repo/contracts/errorCodeSchema` + `@repo/platform/errorCodeToHttpStatus`.
- Env contracts: `@repo/env/apps/<name>` per-app loaders. Examples in `env/{local,production}/`.
- Test harness: `@repo/testing/vitest/{node,jsdom}` shared configs.
- Runtime activation ports: `@repo/infrastructure` owns ports and noop / memory adapters; `apps/api`
  wires app-side DI tokens (`POLICY_EVALUATOR`, `AUDIT_SINK`, `JOB_QUEUE`, `NOTIFIER`,
  `OBJECT_STORAGE`, `OUTBOX_RELAY`). Activation docs in `docs/recipes/enable-*.md` must stay aligned
  with those ports and fail fast instead of silently no-oping unsupported runtime methods.

## When you finish work

1. Run `pnpm format` then the full gate locally (`pnpm check && pnpm build && pnpm test`).
2. If you touched `apps/web` or ran `pnpm build`, check `apps/web/next-env.d.ts` was not flipped by
   Next's generated route import. Restore it to the tracked state before committing.
3. Write the commit body in the documented style (above). Do not skip `Tested:` / `Not-tested:`
   lines.
