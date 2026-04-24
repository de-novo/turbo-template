# Environment Files

Environment values are split by environment and by app.

```text
env/
  local/
    api.env.example
    web.env.example
    desktop.env.example
    mobile.env.example
  production/
    api.env.example
    web.env.example
    desktop.env.example
    mobile.env.example
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

Validate examples:

```bash
pnpm env:check
```
