# sso-gateway

Last checked: 2026-04-26

An edge gateway (Cloudflare Access, Pomerium, Authelia, Kong OIDC plugin, Istio + ext-authz)
terminates SSO and forwards trusted user claims to your API as request headers. The API trusts the
gateway and does not re-validate tokens.

## When to pick this

- All traffic to the API already passes through a known gateway.
- The gateway is part of the platform team's responsibility, not the product team's.
- You want a single point of policy (allowlist, MFA enforcement, network ACL) outside the
  application.

Pairs naturally with `AUTH_TOPOLOGY=msa` because the gateway becomes the identity boundary across
many services.

## Env keys

```env
AUTH_MODE=sso-gateway
AUTH_TOPOLOGY=msa
AUTH_ISSUER_URL=https://sso.example.com         # human-readable; gateway is the real check
AUTH_SERVICE_URL=https://gateway.example.com    # gateway base URL for forward-auth checks
AUTH_AUDIENCE=repo-api
NEXT_PUBLIC_AUTH_MODE=sso-gateway
NEXT_PUBLIC_AUTH_ISSUER_URL=https://sso.example.com
NEXT_PUBLIC_AUTH_SERVICE_URL=https://gateway.example.com
```

`@repo/env/apps/api` requires both `AUTH_ISSUER_URL` and `AUTH_SERVICE_URL` in production for this
mode (and `central-auth-service`). The values are runtime-visible so health checks can confirm
gateway reachability.

## Trust model

The API runs **behind** the gateway. Inbound traffic that bypasses the gateway is rejected at the
network layer (private VPC, sidecar proxy, ingress allow-list) — not by the application. This is the
load-bearing assumption of the recipe; if it breaks, the API exposes unauthenticated handlers to the
public internet.

Concretely:

- The gateway authenticates the user (its own SSO flow / IdP integration).
- The gateway sets headers like `X-Forwarded-User`, `X-Forwarded-Email`, `X-Forwarded-Groups`.
  Header names vary per gateway; pick a fixed contract per deployment.
- The API reads those headers and constructs `UserIdentity`. It does NOT verify a JWT; the gateway
  already did.

## Header parsing (sketch)

```ts
// apps/api/src/auth/gateway.guard.ts (sketched, not shipped by the template)
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AppError } from "@repo/platform";

const HEADER_USER = "x-forwarded-user";
const HEADER_EMAIL = "x-forwarded-email";
const HEADER_GROUPS = "x-forwarded-groups";

@Injectable()
export class GatewayGuard implements CanActivate {
  canActivate(host: ExecutionContext): boolean {
    const req = host.switchToHttp().getRequest();
    const userId = req.headers[HEADER_USER];
    const email = req.headers[HEADER_EMAIL];
    if (typeof userId !== "string" || typeof email !== "string") {
      throw new AppError({
        code: "UNAUTHORIZED",
        message: "Gateway claims missing — request did not flow through the SSO gateway.",
      });
    }
    req.user = {
      userId,
      email,
      memberships: parseGroups(req.headers[HEADER_GROUPS]),
    };
    return true;
  }
}

function parseGroups(value: string | string[] | undefined) {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .map((organizationSlug) => ({
      organizationId: organizationSlug,
      organizationSlug,
      role: "member",
    }));
}
```

The header names above are conventions; **document them in your fork's auth README** so the gateway
side and the API side cannot drift.

## What does NOT live in the API

- Token validation. The gateway already validated the upstream IdP token.
- Login / logout pages on `apps/web`. Those flows live at the gateway (e.g. Cloudflare Access IdP
  redirect, Pomerium login UI).
- Cookie / session storage. The gateway typically issues a session cookie scoped to the gateway's
  domain.

## Health probes

`/health/live` and `/health/ready` should remain reachable **without** the gateway claims —
otherwise the orchestrator (Kubernetes, ALB) cannot probe the pod. Two common patterns:

1. Allow-list `/health/*` and `/metrics` at the gateway as anonymous routes.
2. Configure the orchestrator probe to hit the API directly (sidecar / cluster-local DNS) and leave
   the gateway-fronted endpoint authenticated.

The current `apps/api` already excludes `/health/*` and `/metrics` from the rate-limit guard via
`@SkipThrottle()`; extending that to skip the gateway guard is a one-line addition when adopting
this recipe.

## Test surface

- Verify the API rejects a request without the gateway headers.
- Verify the API populates `UserIdentity` from the documented header set.
- Add an integration test using a fake gateway middleware that sets the headers; this also documents
  the header contract for new contributors.

## Migration paths

- **From `external-oidc` to `sso-gateway`**: keep the OIDC validation path running for a rollover
  window so direct API clients (mobile, CLI) still work; gradually move every client behind the
  gateway, then drop the OIDC guard.
- **From `sso-gateway` to `central-auth-service`**: see
  [central-auth-service.md](./central-auth-service.md). The contracts in `@repo/auth` do not change.
