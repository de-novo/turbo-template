# Auth recipes

Last checked: 2026-04-26

Three concrete wiring guides for the three non-default `AUTH_MODE` values supported by this
template. The default (`better-auth-embedded`) is documented in the main README and is fully mounted
by `apps/api`; the recipes here are the path you follow when product topology pushes auth out of the
application.

## Pick a recipe

| `AUTH_MODE` value      | Use this recipe                                      | When                                                                                                                  |
| ---------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `better-auth-embedded` | (default — see [README.md](../../README.md))         | Auth lives in your API or web app. Solo / single-product start.                                                       |
| `external-oidc`        | [external-oidc.md](./external-oidc.md)               | A third-party IdP (Auth0, Okta, Keycloak, Cognito, Google Workspace) owns login; this app validates tokens.           |
| `sso-gateway`          | [sso-gateway.md](./sso-gateway.md)                   | An edge gateway (Cloudflare Access, Pomerium, Authelia, Kong OIDC plugin) terminates SSO and forwards trusted claims. |
| `central-auth-service` | [central-auth-service.md](./central-auth-service.md) | A dedicated internal auth service owns login/session/token exchange for an MSA topology.                              |

`AUTH_TOPOLOGY` is orthogonal — it documents the deployment shape (`single-app`, `modular-monolith`,
`msa`) and is consumed by `@repo/auth/strategy` for runtime checks. Each recipe notes the typical
`AUTH_TOPOLOGY` value it pairs with.

## What stays the same across recipes

- `@repo/auth` contracts: `Session`, `UserIdentity`, `OrganizationMembership`, `authStrategySchema`,
  `authTopologySchema`. These never change between modes; only the source of truth for the values
  changes.
- `@repo/env/apps/api` validates `AUTH_MODE`, `AUTH_ISSUER_URL`, `AUTH_SERVICE_URL`,
  `AUTH_AUDIENCE`, `AUTH_TOPOLOGY` at boot. `requireInProduction` enforces the recipe-specific
  required keys.
- `apps/api/src/api-env.module.ts` exposes the parsed env via DI; controllers / guards inject
  `API_ENV` rather than re-parsing.

## What changes per recipe

- The token validation strategy (signature verification path, JWKS endpoint, audience check).
- Where the user identity comes from (IdP `userinfo`, gateway-forwarded headers, internal service
  call).
- Whether the API issues sessions itself or trusts upstream session cookies.
- Whether `apps/web` ships a login UI or redirects to an external SSO entry.

Each recipe is intentionally copy-pasteable. Real provider-specific settings (Client ID, issuer URL,
audience claim) belong in your fork's secret store, not in this repo.
