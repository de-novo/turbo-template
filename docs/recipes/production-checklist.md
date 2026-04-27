# Production go-live checklist

A one-page run-through of everything the template _expects_ you to confirm before traffic lands on
production. Each item links to the implementation so the rationale is one click away.

## Environment variables

The API loader (`packages/env/src/apps/api.ts`) enforces the bold ones with `requireInProduction` —
`pnpm env:check` will fail loudly if they're missing when `APP_ENV=production`. The optional ones
tighten defaults but won't fail validation.

| Variable                      | Required in prod?  | What it does                                                                                                       |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **`APP_ENV`**                 | yes                | `production` flips a handful of stricter defaults (stack-trace scrubbing, env validation).                         |
| **`DATABASE_URL`**            | yes                | Postgres connection string. Without it Better Auth falls back to in-memory and sessions vanish on restart.         |
| **`BETTER_AUTH_SECRET`**      | yes (embedded)     | 32-byte secret. The fallback baked into `auth.ts` is for local dev only.                                           |
| **`BETTER_AUTH_URL`**         | yes (embedded)     | Public URL of the API; cookies are scoped to this host.                                                            |
| **`CORS_ORIGINS`**            | yes                | Comma-separated allowlist. Unset in prod ⇒ CORS denies everything.                                                 |
| `EXPOSE_DOCS`                 | no (default true)  | Set `false` to drop `/openapi.json` + `/docs` (returns 404, doesn't signal existence).                             |
| `JOBS_ENABLED`                | no (default false) | Run `@nestjs/schedule` — only on **one replica** (separate workload or leader-election lock). See `env/README.md`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no                 | Enables the OpenTelemetry tracing exporter. Without it the SDK is dormant.                                         |
| `OTEL_SERVICE_VERSION`        | no                 | Reported on every span; defaults to `"0.0.0"` in the OpenAPI doc.                                                  |
| `LOG_LEVEL`                   | no (default info)  | `debug` / `info` / `warn` / `error`. Production typically stays at `info`.                                         |
| `SHUTDOWN_TIMEOUT_MS`         | no (default 30000) | Force-exit after this many ms if drain hangs.                                                                      |

For non-API surfaces, mirror via `NEXT_PUBLIC_*`, `VITE_*`, `EXPO_PUBLIC_*` per loader.

## Auth posture (embedded mode)

- `BETTER_AUTH_SECRET` is set (32+ bytes, randomly generated, **not** the local-dev string).
- `BETTER_AUTH_URL` matches the public host the cookie domain should bind to.
- `/api/auth/sign-in/email` + `/api/auth/sign-up/email` are rate-limited (5 / 15 min / IP) by Better
  Auth's built-in `rateLimit`. Multi-replica deployments need `storage: "database"` (and the
  rate-limit table added to `packages/db/src/schema/auth.ts`) — memory storage doesn't coordinate
  across pods.
- The reference `/me` route is protected by `AuthenticatedGuard`. Other write endpoints copied from
  `/notes` start unauthenticated — protect them yourself before launch (recipe:
  [protect-an-api-route](./protect-an-api-route.md)).

For non-embedded modes, see [docs/auth-recipes/](../auth-recipes/).

## Database

- Migrations applied: `pnpm db:migrate` runs against the prod DSN. Wire it as an init-container step
  (Kubernetes), a release task (Heroku/Render), or a one-shot pre-deploy job — never inside the
  app's normal startup path.
- Pool size + idle timeout reviewed for your runtime. The shipped client uses Drizzle's defaults;
  tune `apps/api/src/db/db.module.ts` if your DB has connection limits.
- Backup strategy is owned by your managed DB provider or your own snapshot job. The template does
  not ship one.

## Observability

- `/health/live` returns 200 once the process is up; wire as the Kubernetes liveness probe.
- `/health/ready` returns 503 when DB is unreachable; wire as the readiness probe.
- `/metrics` is scraped by Prometheus. Default Node.js metrics + the HTTP histogram + counter are
  exposed. Add Grafana panels for `histogram_quantile(0.95, http_request_duration_seconds_bucket)`
  and `rate(http_requests_total[1m])`.
- Logs are structured JSON on stdout. Pipe to your log shipper (Loki, Datadog, CloudWatch). Do
  **not** enable `pino-pretty` in prod (the dev pipe in `apps/api/package.json` runs only via
  `pnpm dev`).
- OpenTelemetry tracing: set `OTEL_EXPORTER_OTLP_ENDPOINT` if you have a collector. The SDK is
  dormant otherwise.
- Error tracking (Sentry / Rollbar / etc.) is not shipped. Add it to `main.ts` if you need it.

## CORS, security headers, secrets

- `CORS_ORIGINS` is set to your production web origins (and only those).
- `apps/web/next.config.ts` ships X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, HSTS. Add CSP if your forks needs it (intentionally not pre-set).
- Secrets are managed by your platform's preferred path: SOPS+age+KSOPS GitOps lane (see
  [docs/secret-management.md](../secret-management.md)) or platform Config Vars (Heroku/Render/
  Railway).
- Stack traces are scrubbed from production logs (`AppErrorFilter` checks `APP_ENV` once at boot).

## Container images

- `ghcr.io/<owner>/<repo>-api` and `ghcr.io/<owner>/<repo>-web`, both with build provenance
  attestation and CycloneDX SBOM via `.github/workflows/release-images.yml`.
- `apps/api/Dockerfile` includes a `HEALTHCHECK` against `/health/live`.
- `outputFileTracingRoot` in `apps/web/next.config.ts` keeps the standalone bundle correct across
  the pnpm symlink layout.

## Graceful shutdown

- The container respects `SIGTERM`: `httpServer.close()` → `app.close()` → DB / OTel drain →
  force-exit at `SHUTDOWN_TIMEOUT_MS`. Tune the `terminationGracePeriodSeconds` on your orchestrator
  to comfortably exceed `SHUTDOWN_TIMEOUT_MS` (e.g., 60 s grace period for a 30 s shutdown timeout).

## Final smoke

```bash
# 1. Image boots and reports the right surface set:
docker run --rm -p 4000:4000 \
  -e APP_ENV=production \
  -e DATABASE_URL=... -e BETTER_AUTH_SECRET=... -e BETTER_AUTH_URL=... \
  -e CORS_ORIGINS=https://app.example.com \
  ghcr.io/<owner>/<repo>-api:vX.Y.Z

# 2. Health probes return 200:
curl -fs http://localhost:4000/health/live
curl -fs http://localhost:4000/health/ready

# 3. /metrics exposes the histogram + counter:
curl -s http://localhost:4000/metrics | grep http_request_duration_seconds_count

# 4. /openapi.json is *not* available when EXPOSE_DOCS=false:
EXPOSE_DOCS=false ... → curl /openapi.json should return 404.
```

Tag your release, push the image, run migrations against the prod DB, then route traffic. Done.
