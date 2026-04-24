# Fullstack TypeScript Template

This repository is a reusable TypeScript monorepo template for web, API, shared contracts, shared
infrastructure, and product design-system work.

The project baseline is documented in [docs/technical-stack.md](./docs/technical-stack.md).

Template naming and bootstrap conventions are documented in
[docs/template-strategy.md](./docs/template-strategy.md).

## Stack Baseline

- Runtime: Node.js 24 LTS
- Package manager: pnpm 10
- Monorepo orchestration: Turborepo
- Linting and formatting gate: Biome lint, Biome format check, Prettier check
- Language: TypeScript 6 with strict shared compiler options
- Web: Next.js 16, React 19, Tailwind CSS 4
- Desktop: Vite React shell, Tauri v2 native packaging path
- Mobile: Expo 55, React Native 0.83
- API: NestJS 11
- UI primitives: shadcn/ui as primitive substrate only
- State and validation: TanStack Query, Zustand, Zod
- Functional runtime: Effect for complex async/error/resource workflows
- Database: Drizzle ORM with PostgreSQL as the default relational path
- Env: app-scoped `@repo/env` loaders with environment-specific examples
- Auth: Better Auth, with centralized auth contracts for future MSA readiness

## Quick Start

Install dependencies:

```bash
pnpm install
```

Run the full verification gate:

```bash
pnpm check
pnpm build
```

`pnpm check` is intentionally strict: Biome lint runs with warnings as failures, TypeScript runs
repo-wide type checks, Biome/Prettier formatting is checked, env examples are validated, and
`DESIGN.md` is validated.

Validate env examples only:

```bash
pnpm env:check
```

Database schema commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

`DATABASE_URL` is optional for template bootstrapping. Drizzle schema generation works without a
live database; migrate/studio require a reachable PostgreSQL database.

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
  env/              # app-scoped env schemas, loaders, and example validation
  infrastructure/   # Redis, Kafka, queue, cache, logger, config adapters
  platform/         # cross-cutting errors, observability, feature flags
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
  -> packages/env
  -> packages/infrastructure
```

`packages/contracts` stays runtime-light and should not depend on app, framework, database, Redis,
Kafka, or browser-only APIs.

## Environment Management

Use `@repo/env` for all app env access. Each app imports only its own loader:

```ts
import { loadApiEnv } from "@repo/env/apps/api";
import { loadWebEnv } from "@repo/env/apps/web";
```

Environment examples are split by environment and app:

```text
env/local/api.env.example
env/local/web.env.example
env/local/desktop.env.example
env/local/mobile.env.example
env/production/api.env.example
env/production/web.env.example
env/production/desktop.env.example
env/production/mobile.env.example
```

Actual `*.env` files are ignored. Deployment systems should inject only the matching app secret
group. `@repo/env` rejects foreign public prefixes by default, so web cannot accidentally receive
`EXPO_PUBLIC_*` or `VITE_*`, and client apps reject server secrets such as `DATABASE_URL` and
`BETTER_AUTH_SECRET`.

## Design System

This project uses [DESIGN.md](./DESIGN.md) as a fast, agent-readable design system brief.

`DESIGN.md` captures machine-readable tokens in YAML front matter and human design rationale in
Markdown. It should be created or updated before meaningful UI work starts.

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

1. Add root workspace config: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`,
   `.gitignore`, `.nvmrc`.
2. Create `packages/contracts`.
3. Create `packages/auth`.
4. Create `packages/ui-primitives`.
5. Create `packages/design-system`.
6. Create `packages/clients` after the first API contract exists.
7. Create `packages/infrastructure` before shared Redis, Kafka, queue, cache, logging, or metrics
   adapters.
8. Create `apps/web`.
9. Create `apps/api`.
10. Create `apps/desktop`.
11. Create `apps/mobile`.

The current template already includes this baseline structure and minimal compile-safe code for
every package above.

## Rename Template

Internal packages should normally keep the stable `@repo/*` scope. After copying the template,
change the project display name and slug first:

```bash
node scripts/rename-template.mjs \
  --name "New Product" \
  --slug "new-product"
```

Only change package scope when packages must be published or consumed outside this monorepo:

```bash
node scripts/rename-template.mjs \
  --name "New Product" \
  --slug "new-product" \
  --scope "@company"
```

## References

- [Technical stack baseline](./docs/technical-stack.md)
- [Template strategy](./docs/template-strategy.md)
- [Project design-system brief](./DESIGN.md)
- [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
