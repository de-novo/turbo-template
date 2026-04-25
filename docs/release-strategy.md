# Release Strategy

Last checked: 2026-04-25

## What we version

The `packages/*` workspace is versioned with [Changesets](https://github.com/changesets/changesets).
The `apps/*` (web, api, desktop, mobile) are explicitly **ignored** in
`.changeset/config.json` — they version with the deployed product, not
through changesets. Packages are private (`"private": true`), so we use
Changesets purely for version + CHANGELOG bookkeeping, not publishing.

## When to add a changeset

Add a changeset on every PR that touches one or more `packages/*`. Skip
for:

- changes scoped to `apps/*`
- root-level tooling (CI, biome config, husky, etc.)
- README / docs / typo fixes that do not change package behavior

A safe rule of thumb: if a downstream consumer of `@repo/<package>` would
care about the change, write a changeset.

## How to add one

```bash
pnpm changeset
```

The CLI walks you through:

1. Pick the affected packages (multi-select).
2. Pick the bump type per package: `major | minor | patch`.
3. Write a short summary that explains the change to a downstream
   consumer.

The result is a new file under `.changeset/<random-name>.md`. Commit it
with the rest of your PR. `commit: false` in `.changeset/config.json`
means contributors stage the file themselves, matching the existing
Husky / commitlint flow.

## How releases land

When you are ready to cut a release on `main`:

```bash
pnpm version-packages
git commit -am "chore(release): version packages"
git tag v0.1.0     # optional, project-specific
```

`pnpm version-packages` runs `changeset version`, which:

- Bumps the `version` field of every affected `packages/*/package.json`.
- Writes per-package `CHANGELOG.md` entries.
- Empties the consumed `.changeset/*.md` files.
- Updates internal-dep version ranges (`updateInternalDependencies: "patch"`).

Apps are skipped (the `ignore` list in the config).

## Why no `release: changeset publish` script

This template's packages are private. Forks that publish to a private
npm registry can opt in:

```jsonc
// package.json
"release": "changeset publish"
```

…and configure an npm token in CI. The template intentionally leaves the
publish step to forks because registry choice and tokens are
project-specific.

## Interaction with `pnpm template:rename`

Pending changeset files reference packages by name (e.g. `@repo/auth`).
If `pnpm template:rename --scope @acme` is used to change the package
scope, regenerate any pending changesets so the package names match.
The default `@repo/*` flow is unaffected.

`scripts/rename-template.mjs` skips the `.changeset` directory entirely
to keep release metadata template-agnostic.
