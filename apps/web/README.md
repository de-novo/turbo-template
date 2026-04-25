# apps/web — Next.js

## Purpose

Customer-facing web surface. Next.js 16 App Router on React 19, styled
with Tailwind 4. Talks to `apps/api` over HTTP and renders product UI on
top of `@repo/design-system`.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, Tailwind CSS 4
- `@tanstack/react-query` for server state, `zustand` for local state
- Better Auth client; session validated against `@repo/auth` schemas
- Next standalone build output for slim Docker images

## Dev

```bash
pnpm dev:web                  # http://localhost:3000
```

`apps/web/.env.local` is loaded automatically; root `.env` provides
defaults for `NEXT_PUBLIC_*`.

## Build

```bash
pnpm --filter @repo/web build      # produces .next/standalone/server.js
```

## Env

Validated by `parseWebEnv()` in `src/env.ts` and called from
`src/instrumentation.ts` (Next.js startup hook). Document new variables in
`.env.example` first.

## Allowed dependencies

`@repo/auth`, `@repo/clients`, `@repo/contracts`, `@repo/design-system`,
plus the React/Next ecosystem.

## Tests

```bash
pnpm --filter @repo/web test
```

Files: `src/env.test.ts`.

## Auth topology

Default mount is Pattern B (auth in `apps/api`). To move the mount here,
follow `docs/auth-recipes/pattern-a-web-mount.md`.
