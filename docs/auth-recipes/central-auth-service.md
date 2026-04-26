# central-auth-service

Last checked: 2026-04-26

A dedicated internal auth service owns login, session storage, token exchange, and
service-to-service tokens for an MSA topology. Every other service trusts tokens minted by the auth
service.

## When to pick this

- You run multiple services and want a single point of session truth.
- The product needs first-party login UI plus first-party social-login plus internal
  machine-to-machine tokens, and you want all three in one codebase.
- Compliance / audit needs a single store of session events.

Pairs with `AUTH_TOPOLOGY=msa`. Implies you operate (or will operate) a separate `apps/auth-service`
deployment — typically a fork of `apps/api` scoped to auth concerns plus a `packages/auth-server`
for the runtime.

## Env keys

```env
AUTH_MODE=central-auth-service
AUTH_TOPOLOGY=msa
AUTH_ISSUER_URL=https://auth.example.com        # the auth service's public URL
AUTH_SERVICE_URL=https://auth.example.com       # internal address used for service-to-service calls
AUTH_AUDIENCE=repo-api
NEXT_PUBLIC_AUTH_MODE=central-auth-service
NEXT_PUBLIC_AUTH_ISSUER_URL=https://auth.example.com
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.example.com
```

`@repo/env/apps/api` requires both `AUTH_ISSUER_URL` and `AUTH_SERVICE_URL` in production for this
mode. The two values often resolve to the same host but differ between public-facing TLS and
cluster-internal service DNS (e.g. `auth.example.com` vs `auth.svc.cluster.local`).

## Architecture sketch

```
┌──────────────┐        ┌──────────────────┐
│  apps/web    │ ─────▶ │ auth-service     │  /auth/login, /auth/callback, /auth/refresh
│              │        │  (Better Auth or │  /auth/sessions, /auth/admin/*
│              │        │   custom impl)   │
└──────────────┘        │                  │
                        │  packages/db     │ users, sessions, accounts, verification
                        └────────┬─────────┘
                                 │ mints session tokens (JWT or opaque)
                                 ▼
┌──────────────┐        ┌──────────────────┐
│ apps/api     │ ─────▶ │ auth-service     │  POST /internal/verify-session
│              │        │   (verify route) │  — service-to-service authenticated
│              │        │                  │
└──────────────┘        └──────────────────┘
```

Two flavors of "the API verifies a token":

1. **Auth service signs JWTs.** Apps verify via JWKS just like `external-oidc`. The difference is
   that the issuer is your own auth service, not a third-party IdP.
2. **Auth service issues opaque tokens.** Apps call `auth-service /internal/verify-session` on each
   request (cached by token+ttl). Heavier per-request, easier to revoke instantly.

## What lives in the auth service

- Login / logout / password reset / email verification / MFA enrollment.
- Session storage (Postgres or Redis).
- OAuth provider integration (Google, GitHub, Apple, internal SSO).
- Service-to-service token minting (`/internal/issue-service-token`).
- Audit log of session events.

## What stays in `apps/api`

- Verify-token guard (calls auth service or verifies signature).
- Permission enforcement using `@repo/auth/permissions`.
- The `@repo/auth/service-auth` contract for incoming service-to-service tokens (separate from
  end-user tokens; different audience claim).

## Service identity (machine-to-machine)

Each service registers with the auth service and receives a service identity. Outbound calls between
services use:

```ts
// pseudocode for apps/api → apps/billing-service
const token = await authClient.issueServiceToken({
  audience: "billing-service",
  scopes: ["invoice:write"],
});
await fetch(`${env.BILLING_SERVICE_URL}/invoices`, {
  headers: { authorization: `Bearer ${token}` },
});
```

`@repo/auth/service-auth` holds the contract: `serviceTokenClaimSchema` enforces audience, issuer,
and the service's allowed scope set.

## Migration paths

- **From `better-auth-embedded` to `central-auth-service`**: extract `packages/auth-server` into its
  own deployment as `apps/auth-service`. Keep the embedded mode running on the old host for a
  rollover window so existing sessions don't expire mid-migration; switch `AUTH_SERVICE_URL` per
  service after the auth service is live.
- **From `external-oidc` to `central-auth-service`**: typically not a migration — it's a rebuild.
  Most teams stick with `external-oidc` until they need first-party login UI; only then do they take
  on the auth-service operational cost.

## Operational notes

- The auth service is a high-blast-radius deployment. Every other service depends on it during the
  request path (or only during token mint, depending on the JWT-vs-opaque choice). Plan for HA from
  day one: at least two replicas, fast database failover.
- `/auth/*` routes should be excluded from the API's rate limiter (login bursts, password reset
  retries) — but the auth service should impose its own per-IP throttling at finer granularity.
- Health probes for the auth service are doubly important: every other service's readiness often
  depends on the auth service being reachable.

## What this template ships

The default `apps/api` mounts the embedded Better Auth path. An `apps/auth-service` is **not**
shipped — once you adopt this recipe you fork `apps/api` (or `packages/auth-server` from the
embedded path) into a new deployment and follow the architecture sketch above.

See [docs/adr/0001-avoid-day-one-overreach.md](../adr/0001-avoid-day-one-overreach.md) for why this
isn't shipped on day one.
