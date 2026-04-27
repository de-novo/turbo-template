# Switch the auth mode

The template supports four `AUTH_MODE` values, each documented in detail under
[docs/auth-recipes/](../auth-recipes/). This recipe is the **mechanical** how-to for switching
between them — see the linked recipes for the conceptual picture.

| Mode                   | Who owns sessions                    | When to pick                                   |
| ---------------------- | ------------------------------------ | ---------------------------------------------- |
| `better-auth-embedded` | The API (Drizzle adapter or memory)  | Default. Solo-to-modular-monolith path.        |
| `external-oidc`        | An external IdP (Auth0, Cognito…)    | Existing IdP, this app validates JWTs.         |
| `sso-gateway`          | An edge gateway / reverse proxy      | Enterprise SSO; apps consume forwarded claims. |
| `central-auth-service` | A separate `auth-service` in the org | Microservices with a shared session store.     |

## Use the helper script

```bash
pnpm template:auth
```

This runs `scripts/select-auth-strategy.mjs`, which:

1. Prompts for the target mode (and topology, if applicable).
2. Updates `env/local/api.env.example`, `env/local/web.env.example`, and the production pairs.
3. Prints the per-mode follow-up steps (which env vars to fill in, which auth recipe to read).

The script is idempotent — re-run it to switch back.

## Manual switch (if you don't want the prompts)

The keys to update are:

```env
# apps/api side
AUTH_MODE=external-oidc           # or sso-gateway, central-auth-service, better-auth-embedded
AUTH_TOPOLOGY=msa                 # single-app | modular-monolith | msa
AUTH_ISSUER_URL=https://idp.example.com         # external-oidc + sso-gateway + central-auth-service
AUTH_SERVICE_URL=https://auth.example.com       # sso-gateway + central-auth-service
BETTER_AUTH_URL=https://app.example.com         # better-auth-embedded only
BETTER_AUTH_SECRET=replace-with-32-byte-secret  # better-auth-embedded only
```

```env
# apps/web side (must mirror)
NEXT_PUBLIC_AUTH_MODE=external-oidc
NEXT_PUBLIC_AUTH_TOPOLOGY=msa
NEXT_PUBLIC_AUTH_ISSUER_URL=https://idp.example.com
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.example.com
```

`requireInProduction` in `packages/env/src/apps/api.ts` enforces the per-mode required keys at
`APP_ENV=production` — `pnpm env:check` will tell you which ones are missing.

## Mount-point side effects

`AUTH_MODE` controls one runtime branch in `apps/api/src/main.ts`:

```ts
if (env.AUTH_MODE === "better-auth-embedded") {
  const auth = createAuth(env, dbClient ?? undefined);
  expressApp.all("/api/auth/*splat", toNodeHandler(auth));
}
```

In the other three modes the API does not mount `/api/auth/*` — auth is handled upstream (IdP /
gateway / auth-service). The OpenAPI document drops the `/api/auth/{path}` entry to match.

If you need to validate JWTs (external-oidc), add a Nest guard that uses `@repo/auth`'s session
contract — there's no shipped guard yet, but the contract is in place to keep the implementation
small.

## Verify

```bash
pnpm env:check                                # examples valid
pnpm --filter @repo/env typecheck
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm dev:api                                  # log line shows auth: memory | drizzle | external
```

Detailed wiring per non-default mode:

- [external-oidc](../auth-recipes/external-oidc.md)
- [sso-gateway](../auth-recipes/sso-gateway.md)
- [central-auth-service](../auth-recipes/central-auth-service.md)
