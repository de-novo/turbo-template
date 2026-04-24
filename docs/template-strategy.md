# Template Strategy

Last checked: 2026-04-24

This repository should become a fast-start template for projects that share the
same TypeScript, Next.js, NestJS, Turborepo, Biome, shadcn, design-system,
contracts, auth, infrastructure, and Effect standards.

## Naming Decision

Default internal package scope: `@repo/*`.

Keep `@repo/*` stable inside the template unless there is a concrete reason to
publish the packages outside the monorepo.

Why:

- It keeps generated imports stable across every project.
- It matches common Turborepo/shadcn monorepo conventions.
- It avoids large rename diffs when starting a new project.
- It lets app identity change without touching package import identity.
- It keeps copy/paste examples, docs, and generated components reusable.

Use project-specific naming for:

- Template display name: `Fullstack TypeScript Template`.
- Template slug: `fullstack-typescript-template`.
- Product display name after copying: `Acme Portal`, `FITT License`, etc.
- Product slug after copying: `acme-portal`, `fitt-license`, etc.
- App package names if useful: `@repo/web`, `@repo/api`.
- Deployment identifiers: container image names, domains, database names,
  Kubernetes namespaces, CI environment names.

Only change `@repo/*` to another scope when:

- Packages will be published to a private npm registry.
- Multiple generated monorepos will be consumed by the same parent repository.
- The organization has a hard naming policy such as `@company/*`.
- Tooling outside the repo requires globally unique package names.

Recommended optional scopes:

```text
@repo/contracts
@repo/auth
@repo/platform
@repo/infrastructure
@repo/clients
@repo/ui-primitives
@repo/design-system
@repo/config
@repo/db
```

## Template Variables

Use a small set of centralized template variables. Avoid scattering product
names directly through generated code.

```text
PROJECT_NAME       Human-facing name, default "Fullstack TypeScript Template"
PROJECT_SLUG       Machine slug, default "fullstack-typescript-template"
PACKAGE_SCOPE      Internal package scope, default "@repo"
PROJECT_DOMAIN     Optional domain, e.g. "license.fitt.example"
PROJECT_TIMEZONE   Default timezone, e.g. "Asia/Seoul"
```

Recommended first source of truth after bootstrap:

```text
project.config.json
```

Example:

```json
{
  "projectName": "Fullstack TypeScript Template",
  "projectSlug": "fullstack-typescript-template",
  "packageScope": "@repo",
  "projectTimezone": "Asia/Seoul"
}
```

Apps and packages may import this later through `@repo/config` once the package
exists. Until then, scripts and docs can read the root file.

## Rename Strategy

Use a script for the safe, frequent changes:

- README title and descriptions.
- DESIGN.md `name` and `description`.
- package root name when `package.json` exists.
- deployment slug placeholders.
- app display name.

Keep package scope replacement optional. The common path should not rename
`@repo/*`.

Recommended command shape:

```bash
node scripts/rename-template.mjs \
  --name "Acme License" \
  --slug "acme-license"
```

Optional package scope rename:

```bash
node scripts/rename-template.mjs \
  --name "Acme License" \
  --slug "acme-license" \
  --scope "@acme"
```

## Generated Baseline

The template prebuilds common structure, not only docs.

Root:

```text
package.json
pnpm-workspace.yaml
turbo.json
biome.json
tsconfig.base.json
.gitignore
.nvmrc
project.config.json
DESIGN.md
README.md
```

Apps:

```text
apps/web
apps/api
apps/desktop
apps/mobile
```

Packages:

```text
packages/contracts
packages/auth
packages/platform
packages/infrastructure
packages/clients
packages/ui-primitives
packages/design-system
packages/config
packages/db
```

Current verification gate:

```bash
pnpm check
pnpm build
pnpm design:lint
```

## Prebuilt Shared Code

Prewrite shared code where the abstraction is already clear.

Good day-one candidates:

- `@repo/contracts`: shared API response envelope, error schema, pagination,
  ID schema, env schema conventions.
- `@repo/auth`: session shape, user identity shape, role/permission constants,
  service-auth claim schema.
- `@repo/platform`: app error taxonomy, result helpers, logger context shape,
  feature flag key registry, time/id helpers.
- `@repo/infrastructure`: Redis/Kafka/cache interfaces and Effect-backed
  adapter skeletons, without requiring live services.
- `@repo/clients`: typed fetch client skeleton, retry/timeout/error mapping.
- `@repo/design-system`: token export, shell layout primitives, status badges,
  empty/loading/error states.
- `@repo/ui-primitives`: shadcn primitive landing zone.
- `@repo/config`: shared tsconfig and tool conventions.

Avoid day-one overreach:

- Do not create real Kafka/Redis production clients before env/config contracts
  and usage are known.
- Do not add a database ORM until the DB ownership is decided.
- Do not generate domain-specific modules before the bounded contexts are known.
- Do not make `DESIGN.md` CLI validation a hard build gate while the format is
  still alpha.

## Recommended Approach

Use `@repo/*` by default and make project identity configurable.

That gives the fastest template workflow:

1. Clone/copy template.
2. Run `node scripts/rename-template.mjs --name "New Product" --slug "new-product"`.
3. Keep internal imports stable as `@repo/*`.
4. Start implementing app/domain behavior immediately.

Package-scope rename remains available, but it is not the default path.
