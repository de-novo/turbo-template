# What this template enables

Last checked: 2026-04-25

Single map of every surface, package, and operational lane the template
ships. Detailed docs are linked at the bottom of each section.

## Application surfaces

Six runnable surfaces ship buildable on day one.

| App                  | Stack                                                          | Port | Notes |
| -------------------- | -------------------------------------------------------------- | ---- | ----- |
| `apps/web`           | Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query, Zustand, next-themes, react-hook-form | 3000 | Standalone build output for slim Docker images. `pnpm --filter @repo/web analyze` runs `@next/bundle-analyzer` |
| `apps/api`           | NestJS 11 (ESM), Pino, Swagger, Better Auth, Drizzle, @nestjs/schedule, @nestjs/throttler, prom-client, @opentelemetry/sdk-node | 4000 | OpenAPI at `/docs`, `/health/live` + `/health/ready`, `/metrics` (Prometheus), OTel tracing opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT`, global 100 req/min/IP rate limit, `notes` + `jobs` reference modules |
| `apps/desktop`       | Vite + React 19, Tauri 2                                       | 3001 | `pnpm dev:desktop` (browser shell), `dev:native` (Tauri devtools) |
| `apps/mobile`        | Expo 55 + React Native 0.85, Expo Router                       | 8081 | iOS, Android, and web export from one source |
| `apps/mfe-host`      | Vite + React, manifest-driven runtime composition              | 3100 | Loads remotes via fetch + dynamic import + custom element |
| `apps/mfe-dashboard` | Vite library mode, shadow DOM custom element                   | 3101 | Canonical MFE remote example |

Tauri desktop and Expo mobile package via their own toolchains and are
not Dockerized. Web and api are.

## Shared packages

Twelve `@repo/*` packages, all `private: true`. Import direction is
documented in the root `README.md` and enforced by example in each
package's README.

| Package                  | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `@repo/auth`             | Session, identity, permission, role Zod contracts (no runtime)       |
| `@repo/auth-server`      | `createAuth()` Better Auth runtime factory + session converter       |
| `@repo/clients`          | `createFetchClient` + `createNotesClient` reference                  |
| `@repo/config`           | Shared tsconfig + biome presets, `projectConfig` from JSON            |
| `@repo/contracts`        | API envelope, error schema, ids, pagination, notes contracts         |
| `@repo/db`               | Drizzle schema (auth + notes + system events) + client factory      |
| `@repo/design-system`    | `AppShell`, `EmptyState`, `StatusBadge`, `designTokens`              |
| `@repo/env`              | Per-app env loaders with foreign-key + secret guards                 |
| `@repo/infrastructure`   | Effect-backed cache / events / health adapters (in-memory + noop)    |
| `@repo/mfe`              | Manifest schema + lifecycle event helpers for the MFE lane           |
| `@repo/platform`         | `AppError`, Pino logger factory, feature flags, time helpers         |
| `@repo/ui-primitives`    | shadcn-style primitives + `cn()` (tailwind-merge)                    |

## Authentication

Better Auth, mounted on a topology of your choice. The contracts in
`@repo/auth` and the runtime factory in `@repo/auth-server` stay the
same across all three; only the mount point changes.

- **Pattern A** — auth in `apps/web` as a Next.js route handler.
- **Pattern B** (default) — auth in `apps/api`. Web/desktop/mobile
  consume it over HTTP.
- **Pattern C** (MSA) — auth in a standalone `apps/auth-service`.

Identity providers wired or wirable:

- Email + password (always on)
- Social: Google, GitHub via `*_CLIENT_ID` + `*_CLIENT_SECRET` pairs
- Generic OIDC (Okta, Auth0, Keycloak, …) via `genericOAuthConfigs`
- Enterprise OIDC + SAML 2.0 via `@better-auth/sso`
- Per-organization SSO at the schema level
  (`sso_provider.organization_id`)

See [auth-topology.md](./auth-topology.md) and `auth-recipes/`.

## Environment management

App-scoped env contracts under `@repo/env/apps/<name>`:

- Each loader picks only its own keys. Foreign keys (e.g.,
  `BETTER_AUTH_SECRET` reaching the web bundle) are rejected at the
  loader boundary via `assertNoForeignKeys`.
- Examples ship per app per environment under
  `env/{local,production}/<app>.env.example`.
- `pnpm env:check` validates every example with the matching loader and
  runs in CI.
- `requireInProduction()` lets schemas mark keys mandatory when
  `APP_ENV === "production"`.

See [env/README.md](../env/README.md) and `packages/env/README.md`.

## Operations

### Container images

- `apps/web/Dockerfile` — three-stage (deps / build / runtime) with
  Next.js standalone output.
- `apps/api/Dockerfile` — three-stage with `pnpm deploy --prod` for the
  slimmest runtime image.
- `docker-compose.yml` — local dev (Postgres only).
- `docker-compose.prod.yml` — local-prod sanity (Postgres + api + web
  with healthchecks).

Images re-tag automatically when `pnpm template:rename` updates
`PROJECT_SLUG` (compose interpolates from env).

### Secret strategies

Three lanes, choose one per environment:

- Platform secret stores (Kubernetes Secret, Vault via External Secrets
  Operator, CSI drivers).
- Runtime injection from the orchestrator.
- **GitOps with encrypted commit** — SOPS + age + KSOPS for Argo CD,
  documented under `ops/gitops/` with `.sops.yaml.example` template.

See [deployment.md](./deployment.md) and
[secret-management.md](./secret-management.md).

## Quality gates

Every PR runs the same checks locally and in CI:

```bash
pnpm check           # biome lint + tsc --noEmit (per-package via Turbo)
pnpm env:check       # @repo/env validates every env/*/*.env.example
pnpm test            # vitest fanout — every app + package
pnpm test:coverage   # vitest fanout with v8 coverage (informational)
pnpm test:scripts    # rename-template self-tests
pnpm build           # turbo build — typed compile + Next/Vite/NestJS
pnpm design:lint     # DESIGN.md schema check (local-only by design)
pnpm syncpack:check  # catalog drift detection across packages
pnpm licenses:check  # production deps match the license allow-list
```

GitHub Actions:

- `.github/workflows/ci.yml` runs the gate above on every PR + push to
  main. Includes `pnpm audit --audit-level=high`.
- `.github/workflows/security.yml` runs Trivy (Dockerfile + IaC config
  scan) and CodeQL (TypeScript/JavaScript, security-extended) on PR,
  push to main, and weekly on Mondays. Findings land in the Security
  tab via SARIF upload.
- `.github/workflows/sbom.yml` generates a CycloneDX SBOM via
  `@cyclonedx/cdxgen` on every published release and on
  `workflow_dispatch`. The SBOM is uploaded as a workflow artifact and
  attached to the GitHub release.
- `.github/workflows/release-images.yml` builds and pushes the `api`
  and `web` Docker images to GHCR on push to `main` and `v*` tags.
  Buildx GHA cache, build provenance attestation, and CycloneDX SBOM
  attached automatically. See [docs/deployment.md](./deployment.md)
  for the tag matrix and how to override the registry.

Commit-time guards:

- `pre-commit` runs `biome check --write` on staged files.
- `commit-msg` enforces Conventional Commits via commitlint.

## Versioning

Changesets tracks `packages/*`. Apps are explicitly ignored —
`@repo/web`, `@repo/api`, `@repo/desktop`, `@repo/mobile` version with
the deployed product.

```bash
pnpm changeset           # interactive; commit the .changeset file
pnpm version-packages    # bump versions + write per-package CHANGELOG
```

The template is private; forks that publish add
`"release": "changeset publish"` and a registry token. See
[release-strategy.md](./release-strategy.md).

## Tooling

- **Template rename** — `pnpm template:rename --name "Acme License"
  --slug "acme-license"`. Five case variants are derived (kebab,
  PascalCase, camelCase, snake_case, CONST_CASE), longest-first to
  avoid partial-shadow rewrites. `--verify` re-walks the tree and
  fails if any default-form token survives. Self-tests in
  `scripts/rename-template.test.mjs`.
- **Single-source project metadata** — `project.config.json` consumed
  via static JSON import in `@repo/config`.
- **Shared config** — `@repo/config/tsconfig/{base,library,
  library-react,node-app,nextjs,vite-react,expo}` and
  `@repo/config/biome/{base,node,react}`.

## Out of scope

Intentionally not shipped. Add when the product needs them:

- Real Redis / Kafka / queue clients. The `@repo/infrastructure`
  package ships interfaces + in-memory / noop implementations.
- Deploy-to-environment CI workflow (k8s, Fly, Render, Vercel).
  Image push to GHCR is shipped via
  `.github/workflows/release-images.yml`; the deploy step
  downstream of that is platform-specific.
- E2E test framework — `apps/e2e` ships a Playwright workspace with
  a chromium-only baseline suite and `pnpm test:e2e` /
  `pnpm test:e2e:install` shortcuts. The suite is intentionally
  outside the default `pnpm test` fanout (script is named `test:e2e`,
  not `test`). A CI workflow that drives it is fork-specific.
- BullMQ / Inngest queue. The api ships an `@nestjs/schedule` cron
  reference (`apps/api/src/jobs/cache-cleanup.job.ts`); swap for a
  real queue when the product picks one.
- Production observability stack — Pino emits JSON, the api exposes
  a `/metrics` Prometheus endpoint via `prom-client`'s default Node +
  process metrics, and the api ships OpenTelemetry SDK wiring
  (`apps/api/src/telemetry.ts`, opt-in via
  `OTEL_EXPORTER_OTLP_ENDPOINT`) with auto-instrumentations for HTTP,
  fetch, pg, express, pino. The receiver (Loki, Datadog,
  Tempo / Jaeger / Honeycomb, OTel collector) is platform-specific.
- EAS or Tauri native build CI. Tauri signing fields are documented
  in [docs/desktop-signing.md](./desktop-signing.md); EAS build
  profiles ship in `apps/mobile/eas.json` (development / preview /
  production); the workflows themselves are fork-specific.
- Analytics or feature-flag platform (only the key registry).
- Database ORM choice for projects that don't own DB access.
- A `release.yml` GitHub workflow for changesets — docs-only path.

These decisions are recorded in
[template-strategy.md](./template-strategy.md) under "Avoid day-one
overreach".

## Reference

- [Technical stack baseline](./technical-stack.md)
- [Template strategy](./template-strategy.md)
- [Auth topology](./auth-topology.md), [auth recipes](./auth-recipes/)
- [Deployment guide](./deployment.md)
- [Secret management](./secret-management.md)
- [Release strategy](./release-strategy.md)
- [env conventions](../env/README.md), [@repo/env](../packages/env/README.md), [@repo/mfe](../packages/mfe/README.md)
