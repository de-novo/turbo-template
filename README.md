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
- Micro frontend: Vite React host/remote template with manifest-based runtime composition
- API: NestJS 11
- UI primitives: shadcn/ui as primitive substrate only
- State and validation: TanStack Query, Zustand, Zod
- Functional runtime: Effect for complex async/error/resource workflows
- Database: Drizzle ORM with PostgreSQL as the default relational path
- Env: app-scoped `@repo/env` loaders with environment-specific examples
- Auth: selectable Better Auth embedded, external OIDC, SSO gateway, or central auth-service mode

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
pnpm dev:mfe
```

Default app ports:

```text
web: http://localhost:3000
desktop: http://localhost:3001
api: http://localhost:4000
mobile metro: http://localhost:8081
mfe host: http://localhost:3100
mfe dashboard remote: http://localhost:3101
```

## Continuous Integration

The template ships a GitHub Actions workflow at `.github/workflows/ci.yml`. It runs on every push to
`main` and every pull request, and fails the build if the verification gate or any app build breaks:

```text
pnpm install --frozen-lockfile
pnpm check       # lint, tsconfig, typecheck, format, env, DESIGN.md
pnpm build       # turbo build for every app and package
```

The workflow uses Node from `.nvmrc`, caches pnpm via `actions/setup-node`, caches Turborepo's local
`.turbo` directory, and cancels in-progress runs for the same ref.

### Turborepo remote cache (optional)

For faster CI on larger repos, enable Turborepo remote cache. Set repository secret `TURBO_TOKEN`
and repository variable `TURBO_TEAM`, then uncomment the matching `env` lines in `ci.yml`. Local
cache continues to work without these.

### Release lane (disabled by default)

`.github/workflows/release.yml` is an inert Changesets-based release stub. The template does not
publish packages by default. To enable it:

1. `pnpm add -Dw @changesets/cli`
2. `pnpm changeset init`
3. Set `NPM_TOKEN` as a repository secret if publishing.
4. Remove the `if: false` guard in `release.yml`.

Until those steps run the workflow performs no work, so it stays out of the way for solo and
internal-only projects.

## Package Boundaries

Planned workspace shape:

```text
apps/
  web/              # Next.js App Router application
  api/              # NestJS application
  desktop/          # Vite React desktop shell, Tauri-ready
  mobile/           # Expo React Native mobile shell
  mfe-host/         # Micro frontend host app
  mfe-dashboard/    # Example micro frontend remote
packages/
  ui-primitives/    # shadcn/ui generated primitives and thin wrappers
  design-system/    # service-owned tokens, components, layouts, patterns
  contracts/        # Zod schemas, DTOs, shared API contracts
  auth/             # shared auth/session/permission policy contracts
  clients/          # typed API clients and external service SDK wrappers
  env/              # app-scoped env schemas, loaders, and example validation
  mfe/              # micro frontend manifest and runtime event contracts
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

## Workspace Dependencies

Declare internal dependencies only in `package.json`, the same way external libraries are installed:

```json
{
  "dependencies": {
    "@repo/auth": "workspace:*",
    "@repo/contracts": "workspace:*",
    "@repo/env": "workspace:*"
  }
}
```

Do not maintain TypeScript project references manually in each app's `tsconfig.json`. They drift as
apps/packages grow and duplicate the dependency graph already owned by `package.json`.

The intended flow is:

```text
package.json dependencies
  -> Turborepo package graph
  -> dependency packages build first via ^build
  -> TypeScript resolves @repo/* through package exports
```

The root quality gate includes `pnpm tsconfig:check`, which fails if a workspace `tsconfig.json`
adds a non-empty `references` array.

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
env/local/mfe-host.env.example
env/production/api.env.example
env/production/web.env.example
env/production/desktop.env.example
env/production/mobile.env.example
env/production/mfe-host.env.example
```

Actual `*.env` files are ignored. Deployment systems should inject only the matching app secret
group. `@repo/env` rejects foreign public prefixes by default, so web cannot accidentally receive
`EXPO_PUBLIC_*` or `VITE_*`, and client apps reject server secrets such as `DATABASE_URL` and
`BETTER_AUTH_SECRET`.

## Auth Strategy Selection

Auth is intentionally a template choice, because the implementation changes when the product moves
from a single app to MSA/SSO. The shared contract lives in `packages/auth`; runtime env selection
lives in `@repo/env`.

Supported modes:

```text
better-auth-embedded   # app/API owns Better Auth session storage and routes
external-oidc          # external IdP such as Auth0/Keycloak/Okta/Cognito owns login
sso-gateway            # edge/API gateway validates SSO and forwards trusted claims
central-auth-service   # internal auth-service owns login/session/token exchange for MSA
```

Supported topology values:

```text
single-app
modular-monolith
msa
```

Use the defaults for fast product starts:

```env
AUTH_MODE=better-auth-embedded
AUTH_TOPOLOGY=modular-monolith
NEXT_PUBLIC_AUTH_MODE=better-auth-embedded
NEXT_PUBLIC_AUTH_TOPOLOGY=modular-monolith
```

When moving to MSA or external SSO, change the mode instead of rewriting local auth semantics:

```env
AUTH_MODE=central-auth-service
AUTH_TOPOLOGY=msa
AUTH_ISSUER_URL=https://auth.example.com
AUTH_SERVICE_URL=https://auth.example.com

NEXT_PUBLIC_AUTH_MODE=central-auth-service
NEXT_PUBLIC_AUTH_TOPOLOGY=msa
NEXT_PUBLIC_AUTH_ISSUER_URL=https://auth.example.com
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.example.com
```

Use the helper when starting a project:

```bash
pnpm template:auth -- --mode better-auth-embedded --topology modular-monolith
pnpm template:auth -- --mode external-oidc --topology modular-monolith --issuer-url https://idp.example.com
pnpm template:auth -- --mode central-auth-service --topology msa --issuer-url https://auth.example.com --service-url https://auth.example.com
```

Keep provider-specific SDK setup in the owning app/service. Keep session shape, user identity,
permission names, token claims, and service-auth semantics in `packages/auth`.

<!-- surface:mfe-host:start -->

## Micro Frontend Template

The template includes a runtime-composed micro frontend lane:

```text
apps/mfe-host
  # host shell that reads a remote manifest URL from env

apps/mfe-dashboard
  # example remote app that registers <repo-mfe-dashboard>

packages/mfe
  # shared manifest schema, remote entry URL resolver, lifecycle event names
```

Run both host and remote:

```bash
pnpm dev:mfe
```

Or run them separately:

```bash
pnpm dev:mfe-host
pnpm dev:mfe-dashboard
```

Default local contract:

```text
VITE_MFE_DASHBOARD_MANIFEST_URL=http://localhost:3101/mfe-manifest.dev.json
remote custom element: <repo-mfe-dashboard>
```

The host does not import the remote source code. It fetches the manifest, validates it with
`@repo/mfe`, loads the remote entry as a module script, and mounts the custom element declared by
the manifest. This keeps team ownership clear while avoiding framework-specific lock-in.

For production, deploy the remote as static assets or behind a CDN and point the host env at the
remote manifest:

```text
VITE_MFE_DASHBOARD_MANIFEST_URL=https://cdn.example.com/mfe/dashboard/mfe-manifest.json
```

If a project later needs Webpack Module Federation, Vite federation, single-spa, or iframe-based
isolation, keep `packages/mfe` as the contract boundary and swap the remote loading strategy inside
the host.

<!-- surface:mfe-host:end -->

## Deployment Environment And Secrets

The repository keeps env contracts in git, not real secrets. In production, the source of truth for
real values should be the deployment platform, CI/CD secret store, or a secrets manager such as
Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Doppler, 1Password Secrets
Automation, or SOPS-backed GitOps.

Detailed SOPS + age + KSOPS guidance and Argo CD examples live in
[docs/secret-management.md](./docs/secret-management.md) and [ops/gitops](./ops/gitops).

### Deployment Rules

- Treat each app as a separate secret boundary.
- Never inject one global env blob into every app.
- Match deployment secret groups to `@repo/env` loaders:
  - API: `@repo/env/apps/api`
  - Web: `@repo/env/apps/web`
  - Desktop: `@repo/env/apps/desktop`
  - Mobile: `@repo/env/apps/mobile`
- Client apps receive only public build/runtime values:
  - Web: `NEXT_PUBLIC_*`
  - Desktop/Vite: `VITE_*`
  - Mobile/Expo: `EXPO_PUBLIC_*`
- Server secrets such as `DATABASE_URL`, `BETTER_AUTH_SECRET`, provider client secrets, private
  signing keys, and service tokens belong only to server-side app secret groups.
- Run `pnpm env:check` in CI to validate committed example contracts.
- Run the deployed app's startup path with the real secret group before promoting traffic. The app
  should fail fast if required production env is missing.

### Recommended Secret Groups

Use names like these in CI/CD or your secrets manager:

```text
turbo-template/local/api
turbo-template/local/web
turbo-template/local/desktop
turbo-template/local/mobile

turbo-template/production/api
turbo-template/production/web
turbo-template/production/desktop
turbo-template/production/mobile
```

Each group should mirror the matching example file:

```text
env/production/api.env.example       -> turbo-template/production/api
env/production/web.env.example       -> turbo-template/production/web
env/production/desktop.env.example   -> turbo-template/production/desktop
env/production/mobile.env.example    -> turbo-template/production/mobile
```

### Vault Or Secret Manager Flow

When using Vault or a similar tool, keep the repo flow the same:

1. Store real values under app-scoped paths, not one shared path.
2. Render or inject only the target app's keys at deploy time.
3. Start the app with those env vars already present.
4. Let `@repo/env` validate the final process env.

Example Vault path mapping:

```text
secret/data/turbo-template/production/api
  APP_ENV=production
  NODE_ENV=production
  PORT=4000
  DATABASE_URL=...
  BETTER_AUTH_URL=...
  BETTER_AUTH_SECRET=...

secret/data/turbo-template/production/web
  NEXT_PUBLIC_APP_ENV=production
  NEXT_PUBLIC_API_URL=https://api.example.com
  NEXT_PUBLIC_WEB_URL=https://app.example.com
```

Do not mount the API path into the web build or web container. The web loader is intentionally
configured to reject `DATABASE_URL` and `BETTER_AUTH_SECRET`.

Common integration options:

- CI fetches secrets from Vault and passes them as environment variables to the build/deploy step.
- Kubernetes uses External Secrets Operator or a Vault CSI driver to sync a secret into the target
  namespace.
- Nomad or a Vault agent renders a template file, then the entrypoint exports it before starting
  Node.
- GitOps stores encrypted secrets with SOPS and decrypts them only in the cluster or CI runner.

### SOPS + age + KSOPS GitOps

Use this only when encrypted Kubernetes Secret manifests must live in git. The template includes an
opt-in example:

```text
.sops.yaml.example
ops/gitops/apps/api/api-secret.enc.yaml.example
ops/gitops/apps/api/secret-generator.yaml
ops/gitops/argocd/ksops-plugin.example.yaml
```

Recommended flow:

```bash
age-keygen -o ~/.config/sops/age/turbo-template.txt
export SOPS_AGE_KEY_FILE=~/.config/sops/age/turbo-template.txt
cp .sops.yaml.example .sops.yaml
cp ops/gitops/apps/api/api-secret.enc.yaml.example ops/gitops/apps/api/api-secret.enc.yaml
sops --encrypt --in-place ops/gitops/apps/api/api-secret.enc.yaml
```

Argo CD should decrypt through a repo-server Config Management Plugin sidecar that has `sops`,
`ksops`, and `kustomize` installed. Mount the age private key only into that sidecar. Application
pods should receive only the resulting Kubernetes Secret such as `api-env`, never the age key.

### Docker Runtime Injection

For server-side Docker containers, inject env at runtime:

```bash
docker run --rm \
  --env APP_ENV=production \
  --env NODE_ENV=production \
  --env PORT=4000 \
  --env DATABASE_URL="$DATABASE_URL" \
  --env BETTER_AUTH_URL="$BETTER_AUTH_URL" \
  --env BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  ghcr.io/org/api:latest
```

An env file is acceptable for local or controlled internal deployments, but keep it app-scoped:

```bash
docker run --rm \
  --env-file ./env/production/api.env \
  ghcr.io/org/api:latest
```

The real `env/production/api.env` file must not be committed. The repository only commits
`env/production/api.env.example`.

### Docker Compose

Compose should also keep env files separated by app:

```yaml
services:
  api:
    image: ghcr.io/org/api:latest
    env_file:
      - ./env/production/api.env
    ports:
      - "4000:4000"

  web:
    image: ghcr.io/org/web:latest
    env_file:
      - ./env/production/web.env
    ports:
      - "3000:3000"
```

Do not reuse `api.env` in the `web` service.

### Kubernetes

Use one Secret per app, then wire it only to that app's Deployment:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-env
type: Opaque
stringData:
  APP_ENV: production
  NODE_ENV: production
  PORT: "4000"
  DATABASE_URL: postgres://app:change-me@db.example.com:5432/app
  BETTER_AUTH_URL: https://app.example.com
  BETTER_AUTH_SECRET: replace-with-a-production-secret-32
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
        - name: api
          image: ghcr.io/org/api:latest
          envFrom:
            - secretRef:
                name: api-env
```

For Vault-backed Kubernetes, prefer generating the same `api-env` shape through External Secrets
Operator or the platform's native secret sync. The app should not need to know whether the values
came from Vault, SOPS, cloud secret manager, or CI variables.

### Build-Time Versus Runtime Env

Some frontend frameworks inline public env at build time:

- Next.js inlines `NEXT_PUBLIC_*` into the client bundle.
- Vite inlines `VITE_*` into the client bundle.
- Expo inlines `EXPO_PUBLIC_*` for the app bundle.

That means public client env must be present during the image or static bundle build, not only when
the container starts. Server-only secrets should be runtime-only and must not be passed to frontend
build jobs.

Recommended split:

```text
Build job for web:
  NEXT_PUBLIC_APP_ENV
  NEXT_PUBLIC_API_URL
  NEXT_PUBLIC_WEB_URL

Runtime job for api:
  APP_ENV
  NODE_ENV
  PORT
  DATABASE_URL
  BETTER_AUTH_URL
  BETTER_AUTH_SECRET
```

### Auth And Service Credentials

Authentication-related secrets should be injected only into the runtime that needs them:

- `BETTER_AUTH_SECRET`: API or auth server only.
- `AUTH_MODE`, `AUTH_TOPOLOGY`, `AUTH_ISSUER_URL`, `AUTH_SERVICE_URL`: API/auth server only unless
  exposed through the matching `NEXT_PUBLIC_*` public web variables.
- OAuth provider client secrets: API/auth server only.
- OAuth public client IDs: client app only if the provider requires them in public config.
- Service-to-service tokens or private signing keys: server-side services only.
- Session cookie domain/origin values: server-side app, with matching public app URL values in web
  env where required.

If this template moves toward MSA, create service-specific env loaders instead of sharing the API
loader:

```text
@repo/env/apps/auth-service
@repo/env/apps/billing-service
@repo/env/apps/worker
```

Each service should own only the secrets it needs.

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

## Prune Unused Surfaces

The template ships every surface enabled (`web`, `api`, `desktop`, `mobile`, `mfe-host`,
`mfe-dashboard`). Solo or focused projects can drop the ones they will not use:

```bash
pnpm template:surfaces --drop mobile,desktop,mfe-host,mfe-dashboard
pnpm template:surfaces --keep web,api --apply
```

The default mode is dry-run; pass `--apply` to actually remove app directories, env example files,
and the matching root `dev:<surface>` scripts. `project.config.json` is updated to reflect the
remaining `surfaces` list. After pruning, run `pnpm install` and `pnpm check` to verify.

## References

- [Technical stack baseline](./docs/technical-stack.md)
- [Template strategy](./docs/template-strategy.md)
- [Project design-system brief](./DESIGN.md)
- [google-labs-code/design.md](https://github.com/google-labs-code/design.md)
