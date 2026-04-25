# Changesets

Per-PR version-bump and CHANGELOG metadata for the `packages/*` workspace.
The `apps/*` are excluded — they version with the project as a whole.

## Workflow

1. Make a code change to one or more `packages/*`.
2. Run `pnpm changeset` and answer the interactive prompts.
3. Commit the resulting `.changeset/*.md` file alongside your code change.

When you are ready to cut a release:

```bash
pnpm version-packages   # bumps versions, writes per-package CHANGELOG.md
git commit -am "chore(release): version packages"
git tag <version>       # optional, project-specific
```

This template does not publish packages (they are private). Forks that
want npm publish should add `"release": "changeset publish"` to the root
`package.json` and an npm token in CI.

See [docs/release-strategy.md](../docs/release-strategy.md) for the full
policy and rationale.
