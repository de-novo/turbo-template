# Contributing

Thanks for considering a contribution. This template is private to its
forks; the rules below keep the baseline coherent so downstream products
can pick it up without surprises.

## Local setup

```bash
pnpm install
cp env/local/api.env.example apps/api/.env
cp env/local/web.env.example apps/web/.env.local
docker compose up -d postgres
pnpm dev
```

See [README.md](./README.md) for per-app dev commands.

## Verification gate

Before opening a PR, run the same gates CI runs:

```bash
pnpm check         # biome lint + tsc --noEmit
pnpm env:check     # validate env/*/*.env.example via @repo/env loaders
pnpm test          # vitest fanout across apps and packages
pnpm test:scripts  # rename-template self-tests
pnpm build         # turbo build pipeline
```

`pnpm design:lint` is local-only by design — not a CI gate.

When you touch dependency versions (especially across multiple
packages), also run:

```bash
pnpm syncpack:check  # detect catalog drift between packages
pnpm syncpack:fix    # auto-fix mismatches and format manifests
```

apps/mobile is intentionally exempted from version sync because Expo
SDK pins `react`, `react-native`, and a few peers to specific versions
(see `.syncpackrc.json`).

For coverage on demand:

```bash
pnpm test:coverage   # turbo fanout; per-package coverage report + HTML
                     # output under each package's coverage/ directory
```

Coverage is intentionally informational, not a CI gate — the smoke
tests are deliberately thin (boundary contracts, not behavior). Tighten
thresholds in your fork after you grow real test bodies.

License compliance:

```bash
pnpm licenses:check  # production deps must match the allow-list
```

The allow-list is in the `licenses:check` script in root
`package.json` (MIT, ISC, Apache-2.0, BSD-2/3-Clause, CC0-1.0,
CC-BY-3.0/4.0, 0BSD, Unlicense, MIT-0, Python-2.0, BlueOak-1.0.0,
WTFPL, UPL-1.0, Artistic-2.0). Add a license to the list only after
checking it against your fork's policy. CI runs this gate.

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/)
enforced by commitlint via Husky's `commit-msg` hook. Use one of:

```
feat: <subject>
fix: <subject>
docs: <subject>
chore: <subject>
refactor: <subject>
test: <subject>
build: <subject>
ci: <subject>
perf: <subject>
```

Optional scope examples: `feat(env): …`, `fix(api): …`, `docs(packages): …`.

## Adding a new domain module

The `notes` module in `apps/api` is the canonical reference. To add a
new entity (e.g. `invoices`):

1. Add Zod schemas to `packages/contracts/src/<entity>.ts`.
2. Add Drizzle tables to `packages/db/src/schema/<entity>.ts`. Add to
   the schema barrel and run `pnpm db:generate`.
3. Add NestJS service + controller under `apps/api/src/<entity>/`.
   Scope queries by `ownerId` and raise `AppError` on not-found.
4. Add a typed client at `packages/clients/src/<entity>-client.ts`.
5. Register the module in `apps/api/src/app.module.ts`.
6. Add or update tests next to the code under test (`*.test.ts`).

## Adding a new app or package

1. Create the directory under `apps/` or `packages/`.
2. `package.json` should set `"private": true`, `"type": "module"`,
   `name: "@repo/<thing>"`, and reference shared configs via
   `"@repo/config": "workspace:*"`.
3. `tsconfig.json` extends one of `@repo/config/tsconfig/*`.
4. Add a `vitest.config.ts` and at least one smoke test.
5. Add a README with Purpose / Public surface / Allowed dependencies /
   Usage / Tests sections (see existing READMEs as templates).
6. If the package owns env, add an entry under
   `packages/env/src/apps/<name>.ts`, an example under
   `env/local/<name>.env.example`, and wire it into
   `packages/env/src/check-examples.ts`.

## Changesets

Any PR touching `packages/*` should include a changeset:

```bash
pnpm changeset
git add .changeset/<random>.md
```

Skip changesets for changes scoped only to `apps/*`, root tooling, or
docs. See [docs/release-strategy.md](./docs/release-strategy.md).

## Renaming the template

Forks adopting this template should run:

```bash
pnpm template:rename --name "Acme Product" --slug "acme-product"
```

The script derives PascalCase / camelCase / snake_case / CONST_CASE
variants automatically and verifies no default-form tokens survive. Do
not rename `@repo/*` scope by hand — pass `--scope @acme` to the same
script if needed.

## Pull requests

- One change per PR. Keep diffs small enough to review in one sitting.
- Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Fill in the
  Test plan and any migration notes.
- Update relevant docs in the same PR (`docs/`, package READMEs,
  `capabilities.md` if a new capability is added).

## Architecture Decision Records

Decisions whose rationale is not obvious from code alone live in
[docs/adr/](./docs/adr/). Open an ADR when a decision crosses package
or app boundaries, constrains a future change, or has been argued and
chosen against alternatives. Skip ADRs for routine refactors, bug
fixes, and dep bumps. See `docs/adr/README.md` for the format and
when to write one.

## Code of Conduct

Participation in this repository is governed by the
[Contributor Covenant](./CODE_OF_CONDUCT.md). Report concerns through
the channel listed in [SECURITY.md](./SECURITY.md).

## Reporting security issues

Please **do not** open a public issue for security reports. See
[SECURITY.md](./SECURITY.md).
