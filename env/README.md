# Environment Files

Environment values are split by environment and by app.

```text
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

Rules:

- Commit only `*.env.example` files.
- Store real values in deployment secrets, local shell profiles, or ignored `*.env` files.
- Each app imports only its own loader from `@repo/env/apps/{app}`.
- Do not inject another app's public prefix into a deployment job.
- Public client prefixes are intentionally separate:
  - Web: `NEXT_PUBLIC_*`
  - Desktop: `VITE_*`
  - Mobile: `EXPO_PUBLIC_*`
- Server secrets such as `DATABASE_URL` and `BETTER_AUTH_SECRET` belong only to server app env.
- Auth strategy is split between server and public client env:
  - API/auth server: `AUTH_MODE`, `AUTH_TOPOLOGY`, `AUTH_ISSUER_URL`, `AUTH_SERVICE_URL`
  - Web public config: `NEXT_PUBLIC_AUTH_MODE`, `NEXT_PUBLIC_AUTH_TOPOLOGY`,
    `NEXT_PUBLIC_AUTH_ISSUER_URL`, `NEXT_PUBLIC_AUTH_SERVICE_URL`
- Use `better-auth-embedded` for a fast modular-monolith start, then switch to `external-oidc`,
  `sso-gateway`, or `central-auth-service` when SSO/MSA ownership is decided.
- Scheduled jobs are off by default. Set `JOBS_ENABLED=true` on exactly one replica to enable
  `@nestjs/schedule` (the sample heartbeat job lives in `apps/api/src/jobs/`). In multi-replica
  deployments, prefer a separate scheduler workload or a leader-election lock so cron tasks aren't
  multiplied by the replica count.

Validate examples:

```bash
pnpm env:check
```
