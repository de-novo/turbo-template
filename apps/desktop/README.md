# apps/desktop — Vite + Tauri

## Purpose

Desktop shell. Vite + React 19 in development, packaged natively via
Tauri 2 for production distribution. Shares the design system with web,
talks to the API over HTTP.

## Stack

- Vite 8, React 19, Tailwind via `@tailwindcss/vite`
- Tauri 2 native shell (`apps/desktop/src-tauri/`)
- TanStack Query for server state, Zustand for local state

## Dev

Pure browser shell (fastest iteration):

```bash
pnpm dev:desktop              # http://localhost:3001
```

Native shell with Tauri devtools (requires Rust toolchain):

```bash
pnpm --filter @repo/desktop dev:native
```

## Build

```bash
pnpm --filter @repo/desktop build           # vite build → dist/
pnpm --filter @repo/desktop build:native    # tauri build → installers
```

Tauri config: `apps/desktop/src-tauri/tauri.conf.json`. The `frontendDist`
field points at the Vite output (`../dist`).

## Env

Vite exposes only variables prefixed `VITE_*` to client code. Place
per-app overrides in `apps/desktop/.env` or `.env.local`. Defaults live
in the root `.env.example`.

## Allowed dependencies

`@repo/auth`, `@repo/config`, `@repo/contracts`, `@repo/design-system`,
plus the React / Vite / Tauri ecosystem.

## Tests

```bash
pnpm --filter @repo/desktop test
```

Files: `src/config.test.ts` (verifies `@repo/config` is reachable through
the Vite resolver).
