# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Cline, Copilot
Workspace, etc.) working in this repository.

## What this repository is

A private TypeScript monorepo template that downstream products fork
via `pnpm template:rename`. Six applications and twelve `@repo/*`
packages on Node 24 / pnpm 10 / Turborepo 2.9 / Biome 2 / TypeScript 6.

Start with [docs/capabilities.md](./docs/capabilities.md) for the full
inventory and [docs/template-strategy.md](./docs/template-strategy.md)
for naming and scope decisions.

## Run commands

Use these instead of inventing alternatives:

```bash
pnpm install
pnpm dev                  # all surfaces
pnpm dev:web | dev:api | dev:desktop | dev:mobile | dev:mfe | dev:mfe-host | dev:mfe-dashboard
pnpm check                # biome lint + tsc --noEmit
pnpm env:check            # validate env/*/*.env.example
pnpm test                 # vitest fanout
pnpm test:scripts         # rename-template self-tests
pnpm build                # turbo build
pnpm db:generate | db:migrate | db:seed | db:studio
pnpm template:rename --name "..." --slug "..." [--scope @acme]
pnpm changeset            # add a packages/* changeset
```

CI runs lint+typecheck → audit (high+critical) → env:check → test →
test:scripts → build, in that order. Any change you make must keep
all of those green.

## Hard rules

- **Conventional Commits.** `commit-msg` runs commitlint. Use
  `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`,
  `perf` with optional scopes like `feat(env): …`.
- **`@repo/*` scope is stable.** Do not rename it manually. Pass
  `--scope @acme` to `pnpm template:rename` if needed.
- **`project.config.json` is the single source of metadata.** Read
  it via `@repo/config` (`projectConfig`); never hardcode.
- **Per-app env loaders only.** Apps must use
  `loadXxxEnv()` from `@repo/env/apps/<name>`. Do NOT introduce a
  new `env.ts` in an app — extend the loader instead.
- **No backwards-compatibility shims.** When refactoring, update call
  sites and remove the old code in the same PR. The template-strategy
  doc forbids stale re-exports and `// removed` comments.
- **Avoid day-one overreach.** See `docs/template-strategy.md`. Do
  NOT add real Redis/Kafka/queue clients before env contracts and
  usage are known. The `@repo/infrastructure` interfaces + memory /
  noop adapters are intentional.

## Workspace boundaries

Allowed dependency direction is documented in
[README.md](./README.md#package-boundaries). Summary:

- `@repo/contracts` is runtime-light (zod only). Nothing else may
  import a Node, browser, or framework module from it.
- `@repo/auth` imports only `@repo/contracts` + `zod`.
- `@repo/auth-server` imports `@repo/auth`, `@repo/contracts`,
  `@repo/db`, `better-auth`. It never appears in a web/desktop/mobile
  bundle.
- `@repo/db` imports `drizzle-orm`, `pg`, `zod`. It is consumed only by
  apps/services that own a database connection.
- `@repo/env/apps/<name>` is consumed only by `apps/<name>` (or its
  tests). Apps must not import another app's loader.
- `@repo/design-system` is consumed by web, desktop, mfe-host. Mobile
  uses native primitives directly.
- `@repo/clients` is the canonical client factory; new entity clients
  go here, not inline in apps.

When a change crosses these boundaries, treat it as an architectural
decision and flag it in the PR description.

## Adding a new domain module (canonical: `notes`)

1. `packages/contracts/src/<entity>.ts` — Zod schemas
   (entity, create input, update input, list query, list response).
   Re-export from `packages/contracts/src/index.ts`.
2. `packages/db/src/schema/<entity>.ts` — Drizzle table with
   `owner_id` FK to `user` and indexes for common access paths. Add
   to `packages/db/src/schema/index.ts`. Run `pnpm db:generate`.
3. `apps/api/src/<entity>/` — service + controller. Service scopes by
   `ownerId` and raises `AppError` on not-found. Controller uses
   `@UseGuards(AuthGuard)` and `@CurrentUser()`. Bodies pipe through
   `ZodValidationPipe`.
4. `packages/clients/src/<entity>-client.ts` — typed wrapper around
   `createFetchClient` with response schemas from `@repo/contracts`.
5. Register the new module in `apps/api/src/app.module.ts`.

Use `apps/api/src/notes/*` and `packages/clients/src/notes-client.ts`
as the diff-by-example.

## Adding a new app or package

See [CONTRIBUTING.md](./CONTRIBUTING.md). Required affordances:

- `tsconfig.json` extends `@repo/config/tsconfig/*`.
- `vitest.config.ts` + at least one `*.test.ts`.
- README with Purpose / Public surface / Allowed deps / Usage / Tests.
- If the package is an app, add a loader at
  `packages/env/src/apps/<name>.ts`, examples under
  `env/{local,production}/<name>.env.example`, and wire it into
  `packages/env/src/check-examples.ts`.

## Things to read before non-trivial changes

- `docs/capabilities.md` — what already exists; do not duplicate.
- `docs/template-strategy.md` — naming, scope, "Avoid day-one
  overreach", verification gate.
- `docs/auth-topology.md` + `docs/auth-recipes/*` — before touching
  Better Auth wiring.
- `packages/env/README.md` — before adding env keys or apps.
- `SECURITY.md` — defensive baseline that must not regress.

## What to never do

- Run `git push --force` or rewrite shared history. The template was
  force-pushed once during initial adoption; don't repeat that.
- Introduce ESLint or Prettier. Biome is the only formatter/linter.
- Add a global `.env` again. Per-app split under `env/` is the rule.
- Use `parseApiEnv` / `parseWebEnv` / `baseEnvSchema` /
  `parseBaseEnv` — those were removed in commit 798ace1.
- Create empty placeholder packages "for later." Empty packages were
  filled in during commit 9c2acb1 and the template-strategy explicitly
  forbids them.
- Skip Husky hooks (`--no-verify`). Fix the root cause instead.

## Quick context for a new agent session

- The template was hardened over commits `9c2acb1 → a5785dc`. The
  current main branch is the canonical state.
- `pnpm test:scripts` runs 18 self-tests for `scripts/rename-template.mjs`.
  If you touch that script, those tests must still pass.
- The `notes` module is the working reference for domain wiring.
- `apps/mfe-host` shows how to load a Module Federation remote at
  runtime via manifest discovery; `apps/mfe-dashboard` is the remote.
