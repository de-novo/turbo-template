# env/

App-scoped environment example files. One file per app per environment.

```
env/
  local/
    api.env.example
    web.env.example
    desktop.env.example
    mobile.env.example
    mfe-host.env.example
  production/
    api.env.example
    web.env.example
    desktop.env.example
    mobile.env.example
    mfe-host.env.example
```

Each file documents only the variables that the corresponding app
consumes. Foreign variables are rejected at boot — see the
`assertNoForeignKeys` guards in `packages/env/src/source.ts`.

## Why split per app

- Web/desktop/mobile bundles must not see `BETTER_AUTH_SECRET` or
  `DATABASE_URL`. Splitting at the file boundary makes that obvious.
- Production deploy pipelines map one secret bundle per app, not one
  shared bundle for the whole monorepo.
- `@repo/env`'s `loadXxxEnv` functions parse only their app's keys.

## Validation

```bash
pnpm env:check     # validates every env/<env>/<app>.env.example via
                   # @repo/env loaders. Runs as part of pnpm check.
```

## Local development

Copy the relevant `local/<app>.env.example` into the app directory as
`.env` (or `.env.local` for Next.js):

```bash
cp env/local/api.env.example apps/api/.env
cp env/local/web.env.example apps/web/.env.local
cp env/local/desktop.env.example apps/desktop/.env
cp env/local/mobile.env.example apps/mobile/.env
cp env/local/mfe-host.env.example apps/mfe-host/.env
```
