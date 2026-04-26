# Contributing

Thanks for considering a contribution. This template ships as a baseline that downstream products
fork via `pnpm template:rename`; the rules below keep the baseline coherent.

## Local setup

```bash
pnpm install
cp env/local/api.env.example apps/api/.env
cp env/local/web.env.example apps/web/.env.local
pnpm dev
```

Per-app dev commands:
`pnpm dev:web | dev:api | dev:desktop | dev:mobile | dev:mfe | dev:mfe-host | dev:mfe-dashboard`.

`dev:mfe` runs the host plus the dashboard remote together. Run individual halves only when you want
to iterate on one without the other.

## Verification gate

Before opening a PR, run the same gates CI runs:

```bash
pnpm check         # biome lint + tsconfig + typecheck + format + env + design
pnpm test          # vitest fanout across apps and packages (jest-expo for mobile)
pnpm build         # turbo build pipeline
pnpm syncpack:check  # workspace catalog drift gate
pnpm licenses:check  # production license allow-list
```

E2E (Playwright) is opt-in and outside `pnpm test`:

```bash
pnpm test:e2e
```

The first run requires `pnpm --filter @repo/web exec playwright install chromium`.

## Commit style

This repository does **not** use Conventional Commits. Commits follow a structured body:

```
<short imperative subject>

<one-paragraph why>

Constraint: <invariant the change must preserve>
Constraint: <another>

Rejected: <alternative> | <reason>
Rejected: <alternative> | <reason>

Confidence: high | med | low
Scope-risk: narrow | medium | broad

Directive: <follow-up guidance for future contributors>

Tested: <command 1>
Tested: <command 2>

Not-tested: <thing left unverified>
```

See `git log -1 --format=fuller` on `main` for the canonical shape.

## Pull request checklist

- The full gate above passes locally.
- New shared logic lives in `@repo/*` packages, not in apps.
- New runtime adapters live in `@repo/infrastructure`, not in `@repo/platform` or `@repo/contracts`.
- New env keys are added to `@repo/env/apps/<name>` and to both `env/local/<name>.env.example` and
  `env/production/<name>.env.example`.
- New error codes extend `@repo/contracts/errorCodeSchema` AND
  `@repo/platform/errorCodeToHttpStatus` together.
- No `tsconfig.references` arrays. No `process.env` reads outside the per-app env adapter.
- The PR description names what is `Tested:` and what is `Not-tested:`.

## Reporting security issues

See [SECURITY.md](./SECURITY.md). Do **not** open a public issue for a vulnerability.
