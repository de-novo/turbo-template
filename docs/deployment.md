# Deployment

Last checked: 2026-04-26

This template ships container images for the two long-running services (`apps/api`, `apps/web`).
Tauri desktop and Expo mobile package via their own toolchains and are not Dockerized — see
[docs/desktop-signing.md](./desktop-signing.md) for the desktop side.

## Image inventory

| Service | Dockerfile            | Default image name (GHCR)          | Port |
| ------- | --------------------- | ---------------------------------- | ---- |
| API     | `apps/api/Dockerfile` | `ghcr.io/<owner>/<repo>-api:<tag>` | 4000 |
| Web     | `apps/web/Dockerfile` | `ghcr.io/<owner>/<repo>-web:<tag>` | 3000 |

The image name follows the `${{ github.repository }}` slug, so `pnpm template:rename` automatically
changes the registry namespace once a fork pushes its first release.

## Publishing to GHCR

`.github/workflows/release-images.yml` builds and pushes `api` and `web` images in parallel to
GitHub Container Registry on every push to `main` and every `v*` tag. `workflow_dispatch` accepts a
manual `tag` input for ad-hoc preview builds.

| Trigger             | Tags published                                       |
| ------------------- | ---------------------------------------------------- |
| push to `main`      | `<branch>` (= `main`), `sha-<short>`, `latest`       |
| `v1.2.3` git tag    | `<tag>` (= `v1.2.3`), `sha-<short>`                  |
| `workflow_dispatch` | `<tag>` (whatever the operator typed), `sha-<short>` |

Every push attests build provenance via `actions/attest-build-provenance`, attaches a CycloneDX
SBOM, and caches Buildx layers on `type=gha` so subsequent runs build only the changed layers.

Pull a published image:

```bash
docker pull ghcr.io/<owner>/<repo>-api:latest
docker pull ghcr.io/<owner>/<repo>-web:latest
```

## Build pipeline

Both Dockerfiles use a three-stage layout.

1. **deps** — `node:24-alpine`. `pnpm fetch` warms a global store from `pnpm-lock.yaml` only. This
   layer caches as long as the lockfile is stable.
2. **build** — installs offline from the warmed store, runs the per-app build
   (`pnpm --filter @repo/<app>... build`), and (for the API) emits a prod-only deploy tree via
   `pnpm deploy --filter=@repo/api --prod /out`. The web image relies on `output: "standalone"` in
   `apps/web/next.config.ts` to produce `apps/web/.next/standalone/` containing a self-contained
   `server.js` + pruned `node_modules`.
3. **runtime** — a non-root `app` user, the prod-only artifact copied in, and the entry command.

Build context must be the **repo root**, not the app directory:

```bash
docker build -f apps/api/Dockerfile -t local/api .
docker build -f apps/web/Dockerfile -t local/web .
```

## Runtime config

Both images expect environment from the matching `@repo/env/apps/<name>` schema. Pull the production
keys from `env/production/<app>.env.example` as the source of truth.

| App | Required in production                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| api | `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` (when `AUTH_MODE=better-auth-embedded`); auth issuer/service URLs for the other modes |
| web | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WEB_URL` (auth issuer/service URLs when `NEXT_PUBLIC_AUTH_MODE` is non-default)                           |

Optional observability:

- `OTEL_EXPORTER_OTLP_ENDPOINT` — when set, `apps/api/src/main.ts` initializes OpenTelemetry;
  otherwise `initOpenTelemetry()` returns `null` and the API runs without trace export.
- `LOG_LEVEL` — `debug | info | warn | error`. Default `info` in production.

## Health probes

`apps/api` exposes Kubernetes-style probes (registered via `HealthModule`):

- `GET /health/live` — liveness. Restart the pod if this fails.
- `GET /health/ready` — readiness. Route traffic when this passes; reports
  `database: not-configured` until `DATABASE_URL` is wired.
- `GET /metrics` — Prometheus scrape. Skip-throttled and unauthenticated by design; restrict at the
  network layer (private VPC, sidecar proxy, ingress allow-list).

## Operational footprint

- **Rate limit**: per-IP 100 req/min via `@nestjs/throttler` (registered in
  `apps/api/src/app.module.ts`). Probes and `/metrics` are excluded via `@SkipThrottle()`.
- **Web security headers**: every `apps/web` response carries `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
  CSP is intentionally not set; forks add it once their asset footprint is known.
- **Request id**: every API request mints or trusts an `x-request-id` header and propagates it
  through `AsyncLocalStorage` so structured logs carry the field.

## What is intentionally not shipped

- A `docker-compose.prod.yml` stack with a bundled Postgres. Production deploys go through GHCR + a
  managed DB; the local dev story is `pnpm dev:api` against an externally-run Postgres.
- Helm charts / Kustomize / Argo CD manifests. The GitOps lane in `ops/gitops` documents the secret
  pattern (SOPS + age + KSOPS) — actual workload manifests are product-specific.
- A separate `release-desktop.yml` / `release-mobile.yml`. Desktop signing varies by platform (see
  [docs/desktop-signing.md](./desktop-signing.md)); EAS Build covers mobile with
  `apps/mobile/eas.json`.
