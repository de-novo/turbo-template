# @repo/env

## Purpose

Per-app env contracts and loaders. Every app picks up only its own keys; the loader rejects foreign
or secret-bearing keys at the boundary so a `web` / `desktop` / `mobile` bundle cannot see
`DATABASE_URL` or `BETTER_AUTH_SECRET`.

## Public surface

Each app subpath returns a typed loader and a Zod schema:

```ts
import { loadApiEnv, type ApiEnv } from "@repo/env/apps/api";
import { loadWebEnv } from "@repo/env/apps/web";
import { loadDesktopEnv } from "@repo/env/apps/desktop";
import { loadMobileEnv } from "@repo/env/apps/mobile";
import { loadMfeHostEnv } from "@repo/env/apps/mfe-host";
```

Common building blocks (`@repo/env`):

- `appEnvironmentSchema` — `local | development | staging | production`
- `nodeEnvironmentSchema` — `development | test | production`
- `projectEnvSchema` — `PROJECT_NAME / SLUG / TIMEZONE` shared shape
- `pickEnv(source, keys)` — keep only declared keys
- `assertNoForeignKeys(appName, source, forbiddenKeys, forbiddenPrefixes, options)` — throws if a
  source includes keys it must not see
- `requireInProduction(ctx, appEnv, values, keys)` — Zod superRefine helper that requires a key only
  when `APP_ENV === "production"`

## Allowed dependencies

- Imports: `zod` only.
- Imported by: `apps/api`, `apps/web`, `apps/desktop`, `apps/mobile`, `apps/mfe-host`. Other
  packages must not depend on a specific app loader.

## Adding a new app

1. Add a loader at `packages/env/src/apps/<name>.ts` mirroring an existing one. Pick the right
   prefix:
   - server: no prefix (api). Forbid `EXPO_PUBLIC_/NEXT_PUBLIC_/VITE_`.
   - Next.js client: `NEXT_PUBLIC_*`. Forbid the secret keys plus `EXPO_PUBLIC_/VITE_`.
   - Vite client (desktop, mfe-host): `VITE_*`. Forbid secret keys plus `EXPO_PUBLIC_/NEXT_PUBLIC_`.
   - Expo client (mobile): `EXPO_PUBLIC_*`. Forbid secret keys plus `NEXT_PUBLIC_/VITE_`.
2. Add an export in `packages/env/src/index.ts` and matching subpath under `exports` in
   `package.json`.
3. Add `env/local/<name>.env.example` and `env/production/<name>.env.example`.
4. Wire `loadXxxEnv` into the app's `apps/<name>/src/env.ts` adapter.
5. `pnpm env:check` validates the example files round-trip through the new loader.

## Why no shared loader

Apps differ on which prefixes are allowed, which keys are required in production, and whether
`process.env` is available at build time vs runtime. A single loader either becomes a permissive
parser (defeating the foreign-prefix rule) or a thicket of conditionals. Per-app loaders keep each
surface honest.

## Production env example

`env/production/<name>.env.example` files must include every key that `requireInProduction` guards.
The `pnpm env:check` script (also wired into CI) loads each example through the matching loader to
ensure the production schema is satisfiable from a known-good example.
