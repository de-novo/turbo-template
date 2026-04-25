# @repo/env

## Purpose

Per-app env contracts and loaders. Replaces the older single-schema
approach: every app picks up only its own keys, and the loader rejects
foreign or secret-bearing keys at the boundary so a web/desktop/mobile
bundle cannot see `DATABASE_URL` or `BETTER_AUTH_SECRET`.

## Public surface

Each app subpath returns a typed loader and a Zod schema:

```ts
import { loadApiEnv, type ApiEnv, pickSocialProviders } from "@repo/env/apps/api";
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
- `assertNoForeignKeys(appName, source, forbiddenKeys, forbiddenPrefixes, options)`
  — throws if a web/api source includes keys it must not see
- `requireInProduction(ctx, appEnv, values, keys)` — Zod superRefine
  helper that requires a key only when `APP_ENV === "production"`

## Allowed dependencies

- Imports: `zod` only.
- Imported by: `apps/api`, `apps/web`, `apps/desktop`, `apps/mobile`,
  `apps/mfe-host`. Other packages must not depend on a specific app
  loader.

## Adding a new app

1. Add a loader at `packages/env/src/apps/<name>.ts` mirroring an
   existing one. Pick the right prefix:
   - server: no prefix (api). Forbid `EXPO_PUBLIC_/NEXT_PUBLIC_/VITE_`.
   - Next.js client: `NEXT_PUBLIC_*`. Forbid the secret keys plus
     `EXPO_PUBLIC_/VITE_`.
   - Vite client (desktop, mfe-host): `VITE_*`. Forbid secret keys plus
     `EXPO_PUBLIC_/NEXT_PUBLIC_`.
   - Expo client (mobile): `EXPO_PUBLIC_*`. Forbid secret keys plus
     `NEXT_PUBLIC_/VITE_`.
2. Re-export it from `packages/env/src/index.ts`.
3. Add `packages/env/src/apps/<name>` to the `exports` map in
   `packages/env/package.json`.
4. Add `env/local/<app>.env.example` and
   `env/production/<app>.env.example` covering every key the loader
   recognizes.
5. Update `packages/env/src/check-examples.ts` so `pnpm env:check`
   validates the new examples.

## Tests

```bash
pnpm --filter @repo/env test         # unit tests for every loader
pnpm --filter @repo/env check:examples
pnpm env:check                       # alias for the above
```

Files: `src/apps.test.ts`, `src/check-examples.ts`.
