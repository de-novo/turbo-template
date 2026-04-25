# Deployment

Last checked: 2026-04-25

This template ships container images for the two long-running services
(`apps/api`, `apps/web`). Tauri desktop and Expo mobile package via their
own toolchains and are not Dockerized — see their per-app READMEs.

## Image inventory

| Service     | Dockerfile                | Default tag                                    | Port |
| ----------- | ------------------------- | ---------------------------------------------- | ---- |
| API         | `apps/api/Dockerfile`     | `${PROJECT_SLUG}-api:${TAG:-local}`            | 4000 |
| Web         | `apps/web/Dockerfile`     | `${PROJECT_SLUG}-web:${TAG:-local}`            | 3000 |
| PostgreSQL  | `postgres:17-alpine`      | bundled in compose for local-prod sanity       | 5432 |

Image names track `PROJECT_SLUG` from `project.config.json`, so
`pnpm template:rename` automatically changes the image namespace.

## Build pipeline

Both Dockerfiles use a three-stage layout.

1. **deps** — `node:24-alpine`. `pnpm fetch` warms a global store from
   `pnpm-lock.yaml` only. This layer caches as long as the lockfile is
   stable.
2. **build** — installs offline from the warmed store, runs the per-app
   build (`pnpm --filter @repo/<app>... build`), and (for the API) emits a
   prod-only deploy tree via `pnpm deploy --filter=@repo/api --prod /out`.
3. **runtime** — minimal Node 24 alpine, non-root `app` user, prod start.
   Web copies the Next.js standalone bundle (`apps/web/.next/standalone`)
   plus `static/` and `public/`. API copies the deploy output and runs
   `node dist/main.js`.

Build from the repo root:

```bash
docker build -f apps/api/Dockerfile -t myorg/api:0.1.0 .
docker build -f apps/web/Dockerfile -t myorg/web:0.1.0 .
```

`apps/web/next.config.ts` enables `output: "standalone"` and sets
`outputFileTracingRoot` to the repo root so the bundle traces every
workspace dependency through pnpm symlinks.

## Local-prod sanity (Docker Compose)

`docker-compose.prod.yml` orchestrates `postgres + api + web` for a quick
end-to-end check. Source environment values from a top-level `.env` (the
compose file reads it); the compose file falls back to template defaults
but requires `BETTER_AUTH_SECRET`.

The simplest local-prod env is to merge the local api + web examples and
override the `BETTER_AUTH_SECRET`:

```bash
cat env/local/api.env.example env/local/web.env.example > .env
# edit .env: set BETTER_AUTH_SECRET to 32+ random chars
#   ( openssl rand -base64 32 )
docker compose -f docker-compose.prod.yml up --build
# api: http://localhost:4000/docs (Swagger)
# web: http://localhost:3000
docker compose -f docker-compose.prod.yml down -v
```

When to use which compose file:

| File                       | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `docker-compose.yml`       | Local dev — only Postgres. Run apps via `pnpm dev`.           |
| `docker-compose.prod.yml`  | Local-prod sanity — full stack inside containers.             |
| (orchestrator manifests)   | Real production — k8s / Fly / Render / etc., template-agnostic. |

## Environment

Per-app env contracts live in `@repo/env/apps/<name>` and are documented
example-by-example under `env/{local,production}/<app>.env.example`. A
deployment maps one secret bundle per app — never a shared bundle for
the whole monorepo (web/desktop/mobile bundles must not see
`BETTER_AUTH_SECRET` or `DATABASE_URL`; the loaders enforce this with
`assertNoForeignKeys`).

When deploying api, set:

- `APP_ENV=production` and `NODE_ENV=production`
- `BETTER_AUTH_SECRET` — 32+ chars (`openssl rand -base64 32`)
- `BETTER_AUTH_URL` — public URL of the API
- `WEB_ORIGIN` — public URL of the web app, used for CORS
- `DATABASE_URL` — managed PostgreSQL connection string

When deploying web, set:

- `NEXT_PUBLIC_APP_ENV=production`
- `NEXT_PUBLIC_API_URL` — public URL of the API for the browser
- `NEXT_PUBLIC_WEB_URL` — public URL of the web app

See `env/production/api.env.example` and
`env/production/web.env.example` for the full inventory.

Never bake secrets into the image. Pass them through orchestrator
secrets / env injection at runtime.

## After `pnpm template:rename`

Image names re-slug automatically because the compose file reads
`PROJECT_SLUG`. Things to set per environment after a rename:

- `BETTER_AUTH_URL`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL` (public hostnames).
- `BETTER_AUTH_SECRET` (per environment).
- Container registry namespace if you publish images.

## Real production (out of scope)

Deployment to k8s, Fly.io, Render, Railway, or AWS is intentionally not
prescribed. Treat the Dockerfiles and `docker-compose.prod.yml` as the
contract, and let the orchestrator decide health, scaling, and secret
delivery. Reasonable defaults:

- Health check: `wget --spider http://api:4000/docs` (Swagger root) or any
  app-specific route once `/health` is added.
- Resource baseline: API 256–512 Mi memory; web 256 Mi at idle.
- Logs: containers emit JSON Pino (`NODE_ENV=production`); ship to your
  platform's log collector.
