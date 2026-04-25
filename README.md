# Fullstack TypeScript Template

This repository is a reusable TypeScript monorepo template for web, API, shared
contracts, shared infrastructure, and product design-system work.

The project baseline is documented in
[docs/technical-stack.md](./docs/technical-stack.md).

Template naming and bootstrap conventions are documented in
[docs/template-strategy.md](./docs/template-strategy.md).

## Stack Baseline

- Runtime: Node.js 24 LTS
- Package manager: pnpm 10
- Monorepo orchestration: Turborepo
- Formatting and linting: Biome
- Language: TypeScript 6
- Web: Next.js 16, React 19, Tailwind CSS 4
- Desktop: Vite React shell, Tauri v2 native packaging path
- Mobile: Expo 55, React Native 0.85
- API: NestJS 11
- UI primitives: shadcn/ui as primitive substrate only
- State and validation: TanStack Query, Zustand, Zod
- Functional runtime: Effect for complex async/error/resource workflows
- Database: Drizzle ORM with PostgreSQL as the default relational path
- Auth: Better Auth, with centralized auth contracts for future MSA readiness

## Quick Start

Install dependencies (also activates Husky hooks via the `prepare` script):

```bash
pnpm install
```

Copy the per-app local environment files and start local infrastructure:

```bash
cp env/local/api.env.example apps/api/.env
cp env/local/web.env.example apps/web/.env.local
docker compose up -d postgres
```

Run the full verification gate:

```bash
pnpm check       # biome lint + tsc --noEmit + env:check (CI gate)
pnpm test        # vitest run across the workspace (CI gate)
pnpm build       # turbo build pipeline (CI gate)
pnpm design:lint # DESIGN.md schema check — local only, intentionally
                 # not a CI gate (see docs/template-strategy.md).
```

Database schema commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

`DATABASE_URL` is optional for template bootstrapping. Drizzle schema generation
works without a live database; migrate/studio require a reachable PostgreSQL
database. The defaults in `env/local/api.env.example` match `docker-compose.yml`.

Start local development:

```bash
pnpm dev
```

Or run one surface at a time:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:desktop
pnpm dev:mobile
```

Default app ports:

```text
web: http://localhost:3000
desktop: http://localhost:3001
api: http://localhost:4000
mobile metro: http://localhost:8081
```

## Package Boundaries

Planned workspace shape:

```text
apps/
  web/              # Next.js App Router application
  api/              # NestJS application
  desktop/          # Vite React desktop shell, Tauri-ready
  mobile/           # Expo React Native mobile shell
packages/
  ui-primitives/    # shadcn/ui generated primitives and thin wrappers
  design-system/    # service-owned tokens, components, layouts, patterns
  contracts/        # Zod schemas, DTOs, shared API contracts
  auth/             # shared auth/session/permission policy contracts
  clients/          # typed API clients and external service SDK wrappers
  infrastructure/   # Redis, Kafka, queue, cache, logger, config adapters
  platform/         # cross-cutting errors, env, observability, feature flags
  config/           # shared TypeScript, Biome, test/build conventions
  db/               # ORM schema/migrations if this project owns DB access
```

Core dependency direction:

```text
apps/web
  -> packages/design-system
  -> packages/clients
  -> packages/auth
  -> packages/contracts

apps/api
  -> packages/auth
  -> packages/contracts
  -> packages/infrastructure
```

`packages/contracts` stays runtime-light and should not depend on app,
framework, database, Redis, Kafka, or browser-only APIs.

## Design System

This project uses [DESIGN.md](./DESIGN.md) as a fast, agent-readable design
system brief.

`DESIGN.md` captures machine-readable tokens in YAML front matter and human
design rationale in Markdown. It should be created or updated before meaningful
UI work starts.

Relationship:

```text
DESIGN.md
  # agent-readable visual identity brief

packages/design-system
  # executable implementation of the design system

packages/ui-primitives
  # shadcn/Radix primitive substrate
```

Validate the design brief when the CLI is available:

```bash
npx @google/design.md lint DESIGN.md
```

## Bootstrap Order

1. Add root workspace config: `package.json`, `pnpm-workspace.yaml`,
   `turbo.json`, `biome.json`, `.gitignore`, `.nvmrc`.
2. Create `packages/contracts`.
3. Create `packages/auth`.
4. Create `packages/ui-primitives`.
5. Create `packages/design-system`.
6. Create `packages/clients` after the first API contract exists.
7. Create `packages/infrastructure` before shared Redis, Kafka, queue, cache,
   logging, or metrics adapters.
8. Create `apps/web`.
9. Create `apps/api`.
10. Create `apps/desktop`.
11. Create `apps/mobile`.

The current template already includes this baseline structure and minimal
compile-safe code for every package above.

## Rename Template

Internal packages should normally keep the stable `@repo/*` scope. After copying
the template, change the project display name and slug first:

```bash
node scripts/rename-template.mjs \
  --name "New Product" \
  --slug "new-product"
```

Only change package scope when packages must be published or consumed outside
this monorepo:

```bash
node scripts/rename-template.mjs \
  --name "New Product" \
  --slug "new-product" \
  --scope "@company"
```

## Local Environment

Env is split per app per environment. Copy the relevant local example into
the app dir:

```bash
cp env/local/api.env.example apps/api/.env
cp env/local/web.env.example apps/web/.env.local
cp env/local/desktop.env.example apps/desktop/.env
cp env/local/mobile.env.example apps/mobile/.env
cp env/local/mfe-host.env.example apps/mfe-host/.env
```

Apps validate their environment at boot via per-app loaders in
`@repo/env/apps/<name>`:

- `apps/api/src/main.ts` calls `loadApiEnv()` (exits on invalid input).
- `apps/web/src/instrumentation.ts` calls `loadWebEnv()` (Next.js startup hook).

Foreign keys are rejected at the loader boundary — the web bundle can't
see `BETTER_AUTH_SECRET` or `DATABASE_URL`, the api can't see
`NEXT_PUBLIC_*` / `VITE_*` / `EXPO_PUBLIC_*`. See `env/README.md` and
`packages/env/src/source.ts` for the rules.

Examples are validated as part of `pnpm check` (via `pnpm env:check`).

## Testing

Tests use [Vitest](https://vitest.dev). The baseline ships runnable tests for
`packages/contracts` (env schema) and `packages/platform` (AppError).

```bash
pnpm test                               # run every package's tests via Turbo
pnpm --filter @repo/contracts test      # run one package
pnpm --filter @repo/platform test:watch # watch mode
```

Add new test files as `src/**/*.test.ts` next to the code under test. Add a
`test` script to any package you want Turbo to pick up.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

1. `pnpm install --frozen-lockfile`
2. `pnpm check` — Biome lint + `tsc --noEmit`
3. `pnpm test`
4. `pnpm build`

The runner uses Node from `.nvmrc` and pnpm from Corepack to stay in sync with
local development.

## Auth

The template ships Better Auth wired into `apps/api` (Pattern B). Three
topologies are supported and swappable without touching the shared packages:

- **Pattern B (default)** — auth mounted in `apps/api`. Web, desktop, and
  mobile all consume it over HTTP.
- **Pattern A** — mount auth in `apps/web` as a Next.js route handler. See
  [docs/auth-recipes/pattern-a-web-mount.md](./docs/auth-recipes/pattern-a-web-mount.md).
- **Pattern C (MSA)** — split auth into `apps/auth-service`. Other services
  validate via HTTP and `@repo/auth` contracts. See
  [docs/auth-recipes/pattern-c-msa.md](./docs/auth-recipes/pattern-c-msa.md).

Layers (stable across all three):

```
@repo/auth         # Zod contracts (session, identity, permissions, service-auth)
@repo/auth-server  # createAuth(db, options) runtime factory
<host app>         # mount point — apps/api by default
```

Default SSO options:

- Email + password (always on)
- Google / GitHub social sign-on (activated when
  `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` or `GITHUB_CLIENT_ID` +
  `GITHUB_CLIENT_SECRET` are set)
- Generic OIDC providers (Okta, Auth0, Keycloak, …) via
  `createAuth({ genericOAuthConfigs: [...] })`
- Enterprise **OIDC + SAML 2.0** via `@better-auth/sso` — always on,
  configured per provider at runtime. See
  [docs/auth-recipes/sso-provider-registration.md](./docs/auth-recipes/sso-provider-registration.md).
  Disable with `createAuth({ sso: { disabled: true } })`.

Per-organization SSO is ready at the schema level
(`sso_provider.organization_id` column) and wires up once the Organization
phase adds the FK.

See [docs/auth-topology.md](./docs/auth-topology.md) for the full decision
matrix and migration rules.

## Adding a domain module

The API ships a minimal `notes` module as a reference pattern. To add a new
entity (e.g. `invoices`, `todos`, `posts`):

1. **Contract** (`packages/contracts/src/<entity>.ts`) — Zod schemas for the
   entity, create/update inputs, list query & response.
2. **DB schema** (`packages/db/src/schema/<entity>.ts`) — Drizzle table with
   an `owner_id` FK to `user` and indexes for common access paths. Add to the
   barrel and run `pnpm db:generate`.
3. **NestJS service + controller** (`apps/api/src/<entity>/`) — the service
   scopes queries by `ownerId` and raises `AppError` on not-found. The
   controller uses `@UseGuards(AuthGuard)` and `@CurrentUser()`, and pipes
   bodies through `ZodValidationPipe`.
4. **Typed client** (`packages/clients/src/<entity>-client.ts`) — thin
   `createFetchClient`-based wrapper with Zod response schemas.
5. Register the new module in `apps/api/src/app.module.ts`.

See `apps/api/src/notes/*` and `packages/clients/src/notes-client.ts` as the
canonical template.

## Logging / Observability

The API uses [Pino](https://getpino.io) via `nestjs-pino`. Every HTTP request
gets an `x-request-id` header (generated if absent), and every log line is
stamped with `service` (from `PROJECT_SLUG`) and `reqId`.

Secrets that tend to sneak in are redacted by default:
`authorization`, `cookie`, `set-cookie`, and any field named `password`.

In development the logger prints pretty, colorized lines via `pino-pretty`.
In production (`NODE_ENV=production`) it emits raw JSON, suitable for any log
pipeline.

`packages/platform` exposes `createPinoLogger(options)` for other surfaces
(workers, CLI tools) that want the same formatting without NestJS.

## API docs

OpenAPI spec + Swagger UI are served at
[http://localhost:4000/docs](http://localhost:4000/docs) when the API is
running. `/auth/*` is excluded because Better Auth owns those routes; run
`pnpm dev:api` and then visit the URL to inspect the rest.

## Git Hooks

Husky is installed automatically during `pnpm install` (via the `prepare`
script). Two hooks are active:

- `pre-commit` runs `lint-staged`, which applies `biome check --write` to
  staged files.
- `commit-msg` runs `commitlint` with the Conventional Commits ruleset
  (`feat:`, `fix:`, `chore:`, etc.).

To bypass hooks only in a genuine emergency, use `git commit --no-verify` and
fix the underlying issue before the next commit.

## Deploy

`apps/web` and `apps/api` ship multi-stage Dockerfiles that build from the
repo root. A local-prod sanity stack is in `docker-compose.prod.yml`:

```bash
docker build -f apps/api/Dockerfile -t myorg/api .
docker build -f apps/web/Dockerfile -t myorg/web .
docker compose -f docker-compose.prod.yml up --build
```

See [docs/deployment.md](./docs/deployment.md) for the full pipeline,
env wiring, and post-rename guidance. Tauri desktop and Expo mobile
package via their own toolchains and are not Dockerized.

## References

- [Capabilities (what this template enables)](./docs/capabilities.md)
- [Technical stack baseline](./docs/technical-stack.md)
- [Template strategy](./docs/template-strategy.md)
- [Deployment guide](./docs/deployment.md)
- [Secret management (SOPS + GitOps)](./docs/secret-management.md)
- [Release strategy](./docs/release-strategy.md)
- [Project design-system brief](./DESIGN.md)
- [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
