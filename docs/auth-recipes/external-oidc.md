# external-oidc

Last checked: 2026-04-26

Third-party IdP (Auth0, Okta, Keycloak, Cognito, Google Workspace, Azure AD) owns login. This app
validates tokens at the API edge and never sees raw passwords.

## When to pick this

- The organization already has an enterprise IdP and SSO is a customer requirement.
- You don't want to run a session/credential database.
- Your users live across multiple products that share an identity provider.

Pairs naturally with `AUTH_TOPOLOGY=modular-monolith` (one app validates tokens) or `msa` (every
service validates the same issuer).

## Env keys

```env
AUTH_MODE=external-oidc
AUTH_TOPOLOGY=modular-monolith        # or msa
AUTH_ISSUER_URL=https://idp.example.com/realms/main
AUTH_AUDIENCE=repo-api                # the IdP-side client ID for the API audience
NEXT_PUBLIC_AUTH_MODE=external-oidc
NEXT_PUBLIC_AUTH_ISSUER_URL=https://idp.example.com/realms/main
```

`@repo/env/apps/api` requires `AUTH_ISSUER_URL` in production for any non-embedded mode.
`AUTH_AUDIENCE` defaults to `repo-api` and should match the IdP's API audience claim.

## Token validation

A typical `apps/api` validation path (sketch):

```ts
// apps/api/src/auth/oidc.guard.ts (sketched, not shipped by the template)
import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { AppError } from "@repo/platform";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { API_ENV, type ApiEnv } from "../api-env.module.js";

@Injectable()
export class OidcGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {
    if (!env.AUTH_ISSUER_URL) {
      throw new AppError({
        code: "INTERNAL",
        message: "AUTH_ISSUER_URL not configured for external-oidc mode.",
      });
    }
    this.jwks = createRemoteJWKSet(new URL(`${env.AUTH_ISSUER_URL}/.well-known/jwks.json`));
  }

  async canActivate(host: ExecutionContext): Promise<boolean> {
    const req = host.switchToHttp().getRequest();
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new AppError({ code: "UNAUTHORIZED", message: "Missing bearer token." });
    }
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.env.AUTH_ISSUER_URL,
      audience: this.env.AUTH_AUDIENCE,
    });
    req.user = payload;
    return true;
  }
}
```

`jose` is the recommended JWKS verifier (small, no native deps, ESM). Add it under `apps/api`'s deps
when adopting this recipe.

## Where user identity comes from

- The IdP's ID token claims (sub, email, name, groups) populate `UserIdentity`.
- Authorization data (org membership, roles) typically comes from a token claim or a sidecar profile
  call (`GET ${ISSUER}/userinfo`).
- Map the IdP claim shape into `@repo/auth`'s `userIdentitySchema` at the edge so downstream code
  stays stable across IdP changes.

## Web side

`apps/web` no longer renders a login form. Two common patterns:

1. **Redirect to IdP from the web app.** Use the IdP's hosted login (e.g., Auth0 Universal Login).
   After callback, store the access/ID token in an HTTP-only cookie or pass it to the API on every
   request via `Authorization: Bearer ...`.
2. **API-issued session cookie wrapping the IdP token.** The web app exchanges the IdP token for an
   API session at `/auth/exchange`; subsequent requests use the API session cookie. Lighter on
   token-exchange churn; needs a session store.

Either path keeps `BETTER_AUTH_*` env vars unset (they only apply to the embedded mode).

## What does NOT live in the API

- A passwords table.
- Password reset flows.
- Social-login provider client secrets.
- MFA enrollment UI.

All of those move to the IdP. The API's job is bounded to "verify the token, populate
`UserIdentity`, enforce permissions".

## Test surface

- Mock the JWKS endpoint at the boundary; do not call the real IdP from unit tests.
- Add a test that verifies the API rejects a token signed with an unexpected issuer.
- Add a test that verifies a token with the wrong `aud` claim is rejected.

## Migration paths

- **From `better-auth-embedded` to `external-oidc`**: keep the existing user table for a rollover
  window; resolve a user record by IdP `sub` claim, then deprecate password columns once every
  active user has logged in via the IdP at least once.
- **From `external-oidc` to `sso-gateway`**: see [sso-gateway.md](./sso-gateway.md). The contracts
  in `@repo/auth` do not change; only the place where claims arrive does.
