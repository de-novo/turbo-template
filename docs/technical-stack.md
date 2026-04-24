# Technical Stack Baseline

Last checked: 2026-04-24

This document defines the initial TypeScript monorepo baseline for this template. The goal is to
keep the stack current, boring where possible, and friendly to multi-app growth: web, API, shared
UI, shared contracts, and internal packages.

## Baseline Decision

Use a pnpm + Turborepo monorepo, with Biome as the primary lint/format engine and Prettier as the
cross-file formatting gate for docs/config surfaces.

Recommended runtime and major versions:

| Area                 | Package / Tool            | Current version checked | Decision                                                                                      |
| -------------------- | ------------------------- | ----------------------: | --------------------------------------------------------------------------------------------- |
| Runtime              | Node.js                   |                 24.15.0 | Use Node 24 LTS for local, CI, and containers.                                                |
| Package manager      | pnpm                      |                 10.33.2 | Use Corepack-pinned pnpm 10.                                                                  |
| Monorepo task runner | turbo                     |                   2.9.6 | Use Turborepo for task graph, cache, and CI filtering.                                        |
| Formatting / linting | @biomejs/biome            |                  2.4.13 | Use Biome lint with warnings as failures and Biome format check.                              |
| Formatting gate      | prettier                  |                   3.8.3 | Use Prettier as the repo-wide docs/config/style formatting gate.                              |
| Agent design spec    | @google/design.md         |                   0.1.1 | Use DESIGN.md as the fast project design-system brief for coding agents.                      |
| Language             | typescript                |                   6.0.3 | Use strict TypeScript 6 and prepare for TypeScript 7.                                         |
| Web app              | next                      |                  16.2.4 | Use App Router and default Turbopack behavior.                                                |
| React                | react / react-dom         |                  19.2.5 | Use React 19 across web and UI packages.                                                      |
| Desktop app          | vite / @tauri-apps/\*     |         8.0.10 / 2.10.1 | Use Vite for fast desktop shell iteration and Tauri v2 for native packaging.                  |
| Mobile app           | expo / react-native       |        55.0.17 / 0.83.6 | Use Expo SDK-compatible React Native for fast iOS, Android, and mobile-web startup.           |
| API app              | @nestjs/core              |                 11.1.19 | Use NestJS 11 on Node 20+ compatible runtime.                                                 |
| Styling              | tailwindcss               |                   4.2.4 | Use Tailwind v4 CSS-first setup.                                                              |
| Tailwind PostCSS     | @tailwindcss/postcss      |                   4.2.4 | Use official Next.js PostCSS plugin path.                                                     |
| UI primitives        | shadcn                    |                   4.4.0 | Use shadcn CLI with monorepo support.                                                         |
| Server state         | @tanstack/react-query     |                 5.100.1 | Use for remote/server cache only.                                                             |
| Client state         | zustand                   |                  5.0.12 | Use for local interactive UI state only.                                                      |
| Validation           | zod                       |                   4.3.6 | Use for runtime boundaries and shared schemas.                                                |
| Functional runtime   | effect                    |                  3.21.2 | Use for typed async, errors, resources, retries, and workflows where complexity justifies it. |
| Database ORM         | drizzle-orm / drizzle-kit |        0.45.2 / 0.31.10 | Use Drizzle with PostgreSQL as the default relational persistence path.                       |
| Env contracts        | @repo/env                 |                internal | Use app-scoped loaders and environment-specific examples.                                     |
| Auth                 | better-auth               |                   1.6.9 | Use for web auth/session; keep server auth contract explicit.                                 |

## Repository Shape

Use flat workspace globs. Do not create nested packages under another package.

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
  config/           # shared tsconfig, Biome, test/build conventions if needed
  db/               # ORM schema/migrations if this project owns DB access
```

Recommended workspace files:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  "@biomejs/biome": "2.4.13"
  "@google/design.md": "0.1.1"
  "@nestjs/core": "11.1.19"
  "@tailwindcss/postcss": "4.2.4"
  "@tanstack/react-query": "5.100.1"
  "@tauri-apps/api": "2.10.1"
  "@tauri-apps/cli": "2.10.1"
  "@vitejs/plugin-react": "6.0.1"
  "better-auth": "1.6.9"
  "effect": "3.21.2"
  "drizzle-kit": "0.31.10"
  "drizzle-orm": "0.45.2"
  "expo": "55.0.17"
  "react-native": "0.83.6"
  "next": "16.2.4"
  "pg": "8.20.0"
  "react": "19.2.5"
  "react-dom": "19.2.5"
  "tailwindcss": "4.2.4"
  "typescript": "6.0.3"
  "vite": "8.0.10"
  "zod": "4.3.6"
  "zustand": "5.0.12"
```

Template naming policy:

- Keep internal package imports as `@repo/*` by default.
- Change project display name and slug through `project.config.json` and
  `scripts/rename-template.mjs`.
- Rename package scope only when packages must be published or consumed outside this monorepo.
- See [template-strategy.md](./template-strategy.md) for the full decision.

```json
{
  "packageManager": "pnpm@10.33.2",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "check": "pnpm lint && pnpm tsconfig:check && pnpm typecheck && pnpm format:check && pnpm env:check && pnpm design:lint",
    "typecheck": "turbo run typecheck",
    "env:check": "pnpm --filter @repo/env check:examples",
    "format": "pnpm format:biome && pnpm format:prettier",
    "format:biome": "biome format --write .",
    "format:check": "biome format . && prettier --check .",
    "format:prettier": "prettier --write .",
    "lint": "biome lint --error-on-warnings .",
    "tsconfig:check": "node scripts/check-tsconfig-references.mjs"
  }
}
```

## Turborepo Standard

Use Turborepo for orchestration, not dependency management. Dependencies still belong in the package
that imports them. Prefer `workspace:*` for internal packages.

`package.json` is the source of truth for internal dependency wiring. Treat `@repo/*` packages like
real installed libraries:

```json
{
  "dependencies": {
    "@repo/contracts": "workspace:*",
    "@repo/env": "workspace:*"
  }
}
```

Do not add TypeScript `references` arrays to app or package `tsconfig.json` files. They duplicate
`package.json`, become painful as app count grows, and are blocked by `pnpm tsconfig:check`.
Turborepo already derives the dependency graph from package manifests, and `typecheck` depends on
`^build`, so dependency packages expose `dist/*.d.ts` through package exports before downstream
packages typecheck.

Recommended task graph:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "check": {
      "dependsOn": ["^check"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

## Biome Standard

Biome is the default code hygiene tool. Keep ESLint only if a framework-specific or security rule is
required and Biome does not cover it. Run Biome lint with `--error-on-warnings`; warning-level drift
should not be allowed to accumulate in the template.

Root `biome.json` should be the baseline:

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.13/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": ["**", "!**/.next", "!**/dist", "!**/coverage", "!**/node_modules"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "useLiteralKeys": "off"
      },
      "suspicious": {
        "noConsole": {
          "level": "error",
          "options": {
            "allow": ["error", "info", "warn"]
          }
        },
        "noExplicitAny": "error"
      },
      "style": {
        "noNonNullAssertion": "error",
        "useImportType": "error"
      }
    },
    "domains": {
      "react": "recommended",
      "test": "recommended"
    }
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

If a package needs local differences, create a package-local `biome.json` with `"extends": "//"`
instead of copying the full config.

## Prettier Standard

Prettier is part of the verification gate, but Biome remains the primary TypeScript/JavaScript
linter. Use Prettier to keep Markdown, JSON, CSS, HTML, and other broad repository surfaces
consistently formatted.

Root Prettier policy:

- `printWidth`: 100, matching Biome.
- `endOfLine`: `lf`.
- `trailingComma`: `all`.
- Ignore generated outputs, caches, `node_modules`, lockfile, and `*.tsbuildinfo`.
- Run `pnpm format:check` in CI and `pnpm format` locally.

## TypeScript Standard

Use TypeScript 6 in strict mode. Treat the shared `tsconfig.base.json` as a high-signal quality
contract rather than a loose compatibility preset.

Recommended shared defaults:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
}
```

Per-package module resolution:

- Next.js/web packages: `"module": "esnext"`, `"moduleResolution": "bundler"`, `"jsx": "preserve"`,
  `"noEmit": true`.
- NestJS/Node packages: `"module": "nodenext"`, `"moduleResolution": "nodenext"` unless a Nest build
  tool explicitly requires another output format.
- Avoid new `baseUrl` usage. Prefer explicit `paths` entries or package `imports`.
- Avoid legacy `moduleResolution: "node"` / `"classic"` and `outFile`.
- Use `--stableTypeOrdering` only as a temporary TypeScript 7 migration diagnostic, not as a normal
  typecheck flag.

## Functional Programming Standard

Prefer functional, explicit, composable TypeScript. Use pure functions and data-first contracts as
the default style. Add Effect where the code has enough asynchronous, error, dependency, or resource
complexity to benefit from a typed runtime.

Use Effect for:

- Multi-step async workflows with typed failures.
- Retry, timeout, interruption, and resource cleanup.
- Kafka/Redis/database/external API integration flows where lifecycle and failure handling matter.
- Background jobs, event consumers, scheduled tasks, and service orchestration.
- Dependency injection for infrastructure services when NestJS DI is not the right boundary.
- Logging, tracing, metrics, and structured diagnostics around workflows.
- Testability where replacing clocks, clients, config, or services should be explicit.

Avoid Effect for:

- Simple React component logic.
- Basic form state or one-shot UI event handlers.
- Tiny pure utilities where a plain function is clearer.
- Shared contract packages that should stay runtime-light.
- Places where the team would need to understand advanced Effect patterns before the code can be
  maintained.

Package placement:

```text
packages/platform
  # effect helpers, error/result conventions, config/effect runtime utilities

packages/infrastructure
  # Effect-backed Redis/Kafka/cache/queue clients and resource layers

packages/contracts
  # stay mostly Effect-free; use Zod/type exports for runtime-light contracts
```

Rules:

- Keep `effect` usage explicit at workflow/infrastructure boundaries. Do not force every function in
  the codebase to return `Effect`.
- Prefer Zod for public API schemas and payload contracts. Use Effect Schema only if the project
  deliberately chooses to standardize on it later.
- Do not mix three error models in one flow. Pick one boundary: plain exceptions, Result-style
  errors, or Effect typed errors.
- At app edges, convert Effect failures into the shared error taxonomy from `packages/platform`.
- In Next.js Client Components, avoid introducing Effect unless there is a clear runtime benefit;
  React Query and React state usually remain the better fit.
- In NestJS, use Effect inside services/workflows where typed error/resource handling matters, but
  keep controllers readable and framework-native.
- Standardize a small set of helpers first: `runWorkflow`, error mapping, timeout/retry policy,
  logging/tracing annotations, and test runtime setup.

## Next.js Standard

Use Next.js 16 App Router with React Server Components by default.

Rules:

- Use `app/` routing, route groups, server actions only where they simplify the domain boundary.
- Keep data fetching server-first when SEO/auth/security benefits exist.
- Use Client Components only for interaction, browser-only APIs, and local UI state.
- Do not pass secrets or privileged API clients through Client Components.
- Use `next dev` and `next build`; Turbopack is the default in Next 16.
- Keep `next.config.ts` small. Avoid custom webpack unless there is a documented blocker.

## Desktop Standard

Use `apps/desktop` as a Vite React shell for fast desktop iteration. Keep Tauri v2 configured but
optional.

Rules:

- Use `pnpm dev:desktop` for fast browser-based desktop shell development.
- Use `pnpm --filter @repo/desktop dev:native` only when native shell behavior matters.
- Keep desktop UI aligned with `packages/design-system`.
- Keep native-only Tauri APIs behind small adapters instead of importing them throughout UI
  components.
- Do not make Rust/Tauri native build a required gate until the product needs packaged desktop
  artifacts.

## Mobile Standard

Use `apps/mobile` as an Expo React Native app with Expo Router.

Rules:

- Prefer Expo SDK-compatible package versions over raw latest React Native packages.
- Mobile may use an Expo-compatible TypeScript version when Expo tooling has not yet caught up with
  repo-wide TypeScript.
- Share `@repo/contracts`, `@repo/auth`, `@repo/config`, and API clients across mobile, web,
  desktop, and API.
- Do not import DOM-focused `packages/design-system` components into React Native screens.
- If mobile design-system reuse grows, create a dedicated native design-system layer rather than
  forcing web components into React Native.

## NestJS Standard

Use NestJS 11 for the API surface.

Rules:

- Organize by domain module, not by technical layer folders at the app root.
- Use DTOs for transport shape and Zod/shared schemas for runtime boundary validation where
  contracts cross apps.
- Keep persistence adapters behind services/repositories; do not leak ORM models into controllers.
- Use global validation/exception/logging modules deliberately, not hidden decorators everywhere.
- Use OpenAPI generation only if it becomes an integration contract; do not let it replace shared
  schema ownership.

## UI And Styling Standard

Use Tailwind v4 + shadcn/ui as the primitive layer, not as the product design system. Keep
service-owned design decisions in a separate design-system package.

Rules:

- Use CSS-first Tailwind v4 with `@import "tailwindcss";`.
- For Next.js, configure PostCSS with `@tailwindcss/postcss`.
- Use shadcn monorepo mode so generated primitives land in `packages/ui-primitives` and app-specific
  blocks land in `apps/web`.
- Treat `packages/ui-primitives` as replaceable/generated-adjacent code: button, dialog, input,
  select, popover, table, toast/sonner, form primitives, and low-level utility hooks.
- Put service-owned UI in `packages/design-system`: brand tokens, semantic components, layouts,
  navigation, workflow widgets, empty/loading/error states, data display patterns, and form
  compositions.
- Product code should prefer importing from `packages/design-system`; import directly from
  `packages/ui-primitives` only when building or extending design-system components.
- Every shadcn-aware workspace needs its own `components.json`.
- Keep the same `style`, `iconLibrary`, and `baseColor` across app and UI package configs.
- For Tailwind v4 in `components.json`, leave the `tailwind.config` field empty.
- Prefer `new-york` style and `lucide` icons unless product design later chooses otherwise.

Recommended UI dependency direction:

```text
apps/web
  -> packages/design-system
    -> packages/ui-primitives
      -> shadcn/Radix/lucide/Tailwind utilities
```

Do not put product-specific naming, business workflow assumptions, or brand semantics into
`ui-primitives`. That package should stay close to upstream shadcn structure so CLI updates and
manual diffs remain cheap.

## DESIGN.md Standard

Use a project-level `DESIGN.md` to quickly capture each product's design system for coding agents,
following the `google-labs-code/design.md` style: YAML front matter for machine-readable tokens,
followed by Markdown rationale for human and agent guidance.

Relationship to packages:

```text
DESIGN.md
  # agent-readable visual identity brief, fast to review and diff

packages/design-system
  # executable implementation of the design system

packages/ui-primitives
  # shadcn/Radix primitive substrate
```

Rules:

- Every app/product should have a `DESIGN.md` before meaningful UI build-out.
- Treat `DESIGN.md` as the fast design contract for agents, screenshots, and early product
  iteration.
- Treat `packages/design-system` as the implementation source of truth once tokens/components are
  coded.
- Keep token names semantic: `canvas`, `surface`, `text-primary`, `accent`, `focus-ring`, not
  `blue-500`.
- Include exact values in front matter: colors, typography, spacing, radius, and key component
  tokens.
- Include rationale in Markdown sections: Overview, Colors, Typography, Layout, Elevation & Depth,
  Shapes, Components, Do's and Don'ts.
- Validate changes with `npx @google/design.md lint DESIGN.md` when the CLI is available.
- Use `npx @google/design.md diff DESIGN.md DESIGN-v2.md` for meaningful design-system changes.
- Export tokens only when useful: `npx @google/design.md export --format tailwind DESIGN.md`.
- Because the format is alpha, do not make the app build depend on the CLI. Use it as a verification
  and agent-context tool first.
- When `DESIGN.md` and `packages/design-system` disagree, update both in the same task or record the
  mismatch as a design-system debt item.

## Data And State Standard

Use the smallest state surface that matches the data owner.

- TanStack Query: server state, request cache, invalidation, mutations, polling, optimistic updates.
- Zustand: ephemeral local state, multi-component UI state, client-only workflow state.
- React state: component-local state.
- URL/search params: shareable filter, pagination, selected tab, and navigation state.
- Zod: API request/response boundaries, env validation, form schemas where the schema is shared with
  the backend.

Avoid duplicating the same data in TanStack Query and Zustand. Query owns remote truth; Zustand may
own UI affordances around it.

## Shared Contracts And Infrastructure

Centralize shared types, schemas, and infrastructure adapters so app packages do not grow their own
incompatible copies.

Recommended package ownership:

```text
packages/contracts
  # API request/response schemas, DTO types, domain event schemas,
  # message payload schemas, shared error shapes

packages/auth
  # auth domain contracts, session/user/org/role/permission models,
  # token claims, service identity policy, guard/middleware helpers

packages/clients
  # typed HTTP/fetch clients, generated or hand-written API clients,
  # third-party SDK wrappers with app-safe interfaces

packages/env
  # app-scoped env schemas, loaders, public-prefix policy,
  # example validation, deploy-time env contracts

packages/infrastructure
  # Redis, Kafka, queues, cache, logger, tracing, metrics,
  # config loading, health checks, connection lifecycle helpers

packages/platform
  # error taxonomy, result helpers, feature flags,
  # observability conventions, time/id helpers, test fixtures
```

Rules:

- API types and runtime schemas start in `packages/contracts`; apps import them instead of
  redefining local DTOs.
- Prefer Zod schemas as the source of truth where runtime validation matters, then infer TypeScript
  types from the schema.
- Auth/session/permission contracts live in `packages/auth`; apps should not invent local role
  strings, permission names, session shapes, or token claim parsing.
- Env contracts live in `packages/env`; apps should not parse broad `process.env` directly outside a
  thin app-local adapter.
- Keep transport-specific client code in `packages/clients`, not inside `apps/web` or `apps/api`.
- Keep runtime adapters such as Kafka producers/consumers, Redis clients, queue helpers, cache
  utilities, and observability wiring in `packages/infrastructure`.
- `packages/contracts` must stay runtime-light and framework-light. It should not depend on NestJS,
  Next.js, Kafka, Redis, database clients, or browser-only APIs.
- `packages/auth` must stay implementation-aware but provider-neutral where possible. Better Auth
  integration can use it, but the package should not make future MSA/service-to-service auth
  impossible.
- `packages/infrastructure` may depend on runtime libraries, but it should expose narrow project
  interfaces so apps are not coupled to vendor-specific details everywhere.
- `packages/platform` owns cross-cutting conventions that must mean the same thing everywhere: error
  codes, feature flags, logging/tracing labels, time/id helpers, and test fixture factories.
- `packages/clients` may depend on `contracts`; it should not own business validation rules that
  belong in `contracts`.
- When an external library appears in more than one app, promote it into `clients` or
  `infrastructure` before usage diverges.
- Add new shared libraries intentionally. The package boundary should state whether it owns a
  contract, a client, or a runtime adapter.

Suggested dependency direction:

```text
apps/web
  -> packages/clients
  -> packages/auth
  -> packages/contracts

apps/api
  -> packages/auth
  -> packages/contracts
  -> packages/env
  -> packages/infrastructure

packages/auth
  -> packages/contracts

packages/clients
  -> packages/contracts

packages/env
  -> external zod only

packages/infrastructure
  -> packages/contracts

packages/platform
  -> packages/contracts
```

Avoid reverse dependencies from `contracts` into `auth`, `clients`, `infrastructure`, `db`, `web`,
or `api`.

Dependency direction is documented here as architecture guidance only. The executable dependency
graph must live in `package.json` through `workspace:*`; do not mirror it with
`tsconfig.references`.

## Environment Standard

Use `packages/env` as the only shared env contract package. The package owns app-scoped schemas,
loaders, public-prefix policy, and example validation.

Directory shape:

```text
env/
  local/
    api.env.example
    web.env.example
    desktop.env.example
    mobile.env.example
  production/
    api.env.example
    web.env.example
    desktop.env.example
    mobile.env.example

packages/env/
  src/apps/api.ts
  src/apps/web.ts
  src/apps/desktop.ts
  src/apps/mobile.ts
```

Rules:

- Commit only `*.env.example` files. Real `*.env` files stay ignored.
- Each app imports only its loader: `@repo/env/apps/api`, `@repo/env/apps/web`,
  `@repo/env/apps/desktop`, or `@repo/env/apps/mobile`.
- App code may have a single thin adapter such as `apps/web/src/env.ts`; do not read env values
  throughout feature code.
- App loaders pick only allowlisted keys before parsing.
- Foreign public prefixes fail by default:
  - API rejects `NEXT_PUBLIC_*`, `VITE_*`, and `EXPO_PUBLIC_*`.
  - Web rejects `VITE_*` and `EXPO_PUBLIC_*`.
  - Desktop rejects `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*`.
  - Mobile rejects `NEXT_PUBLIC_*` and `VITE_*`.
- Client apps reject server secrets such as `DATABASE_URL` and `BETTER_AUTH_SECRET`.
- Production env examples must include required production-only values; local examples can rely on
  safe defaults.
- CI/CD should inject app-specific secret groups rather than one global env blob.
- Validate examples with `pnpm env:check`; root `pnpm check` includes this gate.

## Database Standard

Use `packages/db` as the centralized persistence package when this template owns the database.

Rules:

- Use Drizzle ORM with PostgreSQL by default.
- Keep schema definitions in `packages/db/src/schema`.
- Keep `DATABASE_URL` optional for template bootstrapping; schema generation should work before a
  live database exists.
- Use root scripts for database work: `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:studio`.
- Apps should import typed DB helpers from `@repo/db`; do not create app-local ORM clients.
- Do not leak Drizzle table definitions into public API contracts. Convert DB rows to explicit
  API/domain shapes.
- If the project later splits into MSA, each service should own its DB schema; shared schemas should
  move out of `packages/db` and into service-owned packages.

## Additional Centralization Candidates

Centralize only when divergent local definitions would create bugs, security gaps, or operational
ambiguity. Do not centralize app-specific implementation detail just because it is reusable once.

Promotion criteria:

- Two or more apps/packages need the same concept and local divergence would be risky.
- The concept crosses a runtime boundary: HTTP, event bus, queue, storage, auth, config, or
  deployment.
- The concept appears in tests as repeated setup/mocking boilerplate.
- A future MSA split would require compatibility for the concept.
- Operational debugging depends on consistent names, IDs, codes, or labels.

Strong candidates:

- Error taxonomy: canonical error codes, public messages, internal diagnostic metadata, and HTTP/RPC
  mapping.
- Environment/config schema: typed env validation, config defaults, secret presence checks, and
  deploy-time config contracts.
- Observability conventions: logger fields, trace/span names, metric names, audit-event shape,
  request correlation IDs.
- Feature flags: flag names, targeting context shape, default behavior, and kill-switch semantics.
- Time and IDs: clock abstraction for tests, timezone policy, ID generators, request IDs, sortable
  IDs if needed.
- Event and job contracts: Kafka topic names, event names, payload schemas, retry/dead-letter
  metadata, job idempotency keys.
- Storage/file contracts: bucket names, object key builders, signed URL policy, MIME/size rules,
  upload lifecycle events.
- Notification contracts: email/SMS/push template keys, payload schemas, delivery status event
  shape.
- Test support: shared fixtures, contract test helpers, mock auth/session factories, API client test
  harnesses.
- API error/client behavior: retry policy, timeout defaults, auth refresh behavior, idempotency
  headers.

Usually keep local:

- Page-only UI state and page-specific layout composition.
- One-off third-party integration code used by one app only.
- Domain logic that belongs to a single bounded context.
- Experimental utilities before a second real consumer exists.

Future package candidates, only after real usage appears:

```text
packages/events
  # Kafka topic registry, event schemas, consumer group names,
  # retry/dead-letter policy, event versioning helpers

packages/jobs
  # background job names, payload schemas, schedule definitions,
  # idempotency and retry helpers

packages/storage
  # bucket/object key policy, upload constraints,
  # signed URL helpers, file lifecycle events

packages/notifications
  # email/SMS/push template keys, payload schemas,
  # delivery provider adapters and status events

packages/i18n
  # locale policy, translation keys, message formatting,
  # timezone/currency display conventions

packages/testing
  # shared fixtures, contract test helpers, mock auth/session,
  # API client test harnesses, test clocks
```

Do not create these packages on day one unless the first implementation already has a real consumer
and a clear owner. Start inside `contracts`, `platform`, or `infrastructure`, then split when the
package boundary becomes stable.

## Auth Standard

Use Better Auth for web authentication if this product owns auth/session logic, but keep auth
contracts and authorization policy centralized for future MSA.

Recommended shape:

```text
packages/auth/src/session/
packages/auth/src/identity/
packages/auth/src/permissions/
packages/auth/src/service-auth/
apps/web/src/lib/auth.ts
apps/web/src/lib/auth-client.ts
apps/web/src/app/api/auth/[...all]/route.ts
```

Rules:

- `packages/auth` owns canonical user/session/org membership/role/permission names and token claim
  schemas.
- `packages/auth` owns authorization helpers that can be reused by web, API, background workers, and
  future services.
- MSA readiness requires service identity contracts: internal service name, allowed audience, token
  issuer, token claims, and machine-to-machine permission model.
- Keep UI login/session convenience in `apps/web`, but do not let `apps/web` become the source of
  truth for auth semantics.
- Keep Better Auth server config in a server-only module.
- Expose Next.js auth route via `toNextJsHandler(auth)`.
- Use Better Auth React client utilities only in Client Components.
- Put authorization policy in the API/domain layer, not only in UI route guards.
- Decide early whether the source of user/org membership truth lives in this repo or in an external
  identity/admin service.
- If auth later becomes its own service, `packages/auth` should become the migration bridge: shared
  claim schemas, permission vocabulary, and compatibility helpers move first; storage/session
  implementation moves after.

## Suggested First Bootstrap

If starting from this empty workspace, bootstrap in this order:

1. Add root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `.gitignore`,
   `.nvmrc`.
2. Create `packages/contracts` with Zod and TypeScript build/typecheck.
3. Create `packages/auth` for shared session, identity, permission, and future service-auth
   contracts.
4. Create `packages/ui-primitives` through shadcn monorepo setup or mirror its expected structure.
5. Create `packages/design-system` on top of `ui-primitives` for service-owned UI.
6. Create `packages/clients` for typed API clients once the first API contract exists.
7. Create `packages/infrastructure` before introducing shared Redis, Kafka, queue, cache, logging,
   or metrics adapters.
8. Create `apps/web` with Next.js 16, Tailwind v4, React Query provider, and Better Auth route stub.
9. Create `apps/api` with NestJS 11 and health/config validation.
10. Add CI commands: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm typecheck`, `pnpm build`.

## References Checked

- Node.js Release Working Group schedule: Node 24 is Active LTS, Node 22 is Maintenance LTS, Node 20
  ends on 2026-04-30.
- TypeScript 6.0 release notes: TypeScript 6 bridges to TypeScript 7, supports newer lib targets,
  and deprecates older module resolution patterns.
- Next.js 16 upgrade guide: Node.js 20.9+ minimum, TypeScript 5.1+ minimum, Turbopack default for
  `next dev` and `next build`.
- NestJS migration guide: NestJS 11 requires Node.js v20 or higher and recommends latest LTS.
- Turborepo workspace guide: avoid nested packages under `apps/**` or `packages/**`.
- Biome big-project guide: Biome v2 supports monorepos and nested configs via `"extends": "//"`.
- Biome linter guide: recommended rules are enabled by default and formatting is owned by the
  formatter, not lint rules.
- Effect docs: Effect targets robust TypeScript workflows with typed errors, retry/recovery,
  interruption, dependency management, observability, and incremental adoption.
- Tailwind Next.js guide: Tailwind v4 uses `@tailwindcss/postcss` and `@import "tailwindcss";`.
- shadcn/ui monorepo guide: CLI supports monorepos, `packages/ui`, per-workspace `components.json`,
  and empty Tailwind config for v4.
- TanStack Query v5 migration guide: React 18+ and modern TypeScript are minimums; v5 is the current
  major API surface.
- Prisma Better Auth guide: Better Auth uses `/api/auth/[...all]` and `toNextJsHandler(auth)` in
  Next.js.
