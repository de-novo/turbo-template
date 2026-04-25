# apps/web — Next.js

## Purpose

Customer-facing web surface. Next.js 16 App Router on React 19, styled
with Tailwind 4. Talks to `apps/api` over HTTP and renders product UI on
top of `@repo/design-system`.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19, Tailwind CSS 4
- `@tanstack/react-query` for server state, `zustand` for local state
- `next-themes` for system / light / dark theming
- `react-hook-form` + `@hookform/resolvers/zod` for forms backed by
  `@repo/contracts` schemas (single source of truth)
- Better Auth client; session validated against `@repo/auth` schemas
- Next standalone build output for slim Docker images
- Conservative security headers in `next.config.ts` (X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS).
  CSP is intentionally not pre-shipped — see SECURITY.md.

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

Validated by `loadWebEnv()` from `@repo/env/apps/web`, called from
`src/instrumentation.ts` (Next.js startup hook). Document new
variables in `env/local/web.env.example` and the loader, then re-run
`pnpm env:check`.

## Conventions

- Root client providers in `src/app/providers.tsx`:
  `ThemeProvider` (next-themes) → `ErrorBoundary` → `QueryClientProvider`.
- `src/components/error-boundary.tsx` is the canonical render-phase
  boundary. Wrap risky surfaces in narrower boundaries when their
  failure should not blank the page.
- `src/components/note-form.tsx` is the form reference: rhf +
  `zodResolver(createNoteInputSchema)`, prop named `onSubmitAction`
  to satisfy Next.js 16's "use client" entry rule.

## Allowed dependencies

`@repo/auth`, `@repo/clients`, `@repo/contracts`, `@repo/design-system`,
`@repo/env`, `@repo/platform`, plus the React/Next ecosystem.

## Tests

```bash
pnpm --filter @repo/web test
```

Files: `src/env.test.ts`.

## Auth topology

Default mount is Pattern B (auth in `apps/api`). To move the mount here,
follow `docs/auth-recipes/pattern-a-web-mount.md`.
