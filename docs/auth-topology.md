# Auth Topology

This template supports three auth topologies. The **contracts** in
`packages/auth` and the **runtime factory** in `packages/auth-server` stay the
same across all three — only the _mount point_ changes.

## Three layers (unchanged across all topologies)

```
@repo/auth         = contracts (Zod only, framework-free, always shared)
@repo/auth-server  = runtime factory: createAuth(db, options)
Host app(s)        = mount point (A, B, or C)
```

## Pattern B — auth in API (template default)

The template ships this wired up.

```
[web] [desktop] [mobile]  ──HTTP──▶  [apps/api]
                                       │  mounts @repo/auth-server
                                       │  /auth/*  (Better Auth handler)
                                       │  /me      (AuthGuard + @CurrentUser)
                                       ▼
                                     [Postgres: user, session, account, verification]
```

Use when: you have a single API that owns business truth. Cheapest future MSA
split (the auth module inside `apps/api` becomes `apps/auth-service`).

## Pattern A — auth in web

Better Auth runs as a Next.js route handler in `apps/web`. The API validates
sessions by reading the same database directly or by calling the web app.

Use when: you don't have an API yet, or web is the only server-side surface.

See [auth-recipes/pattern-a-web-mount.md](./auth-recipes/pattern-a-web-mount.md)
for the step-by-step switch from Pattern B.

## Pattern C — dedicated auth service (MSA)

A new `apps/auth-service` owns Better Auth and the auth tables. Other services
— including `apps/api` — validate sessions via HTTP and/or service-to-service
JWTs defined by `packages/auth/service-auth.ts`.

Use when: you have (or expect) multiple backend services with distinct data
boundaries, regulatory isolation needs, or independent deploy cadence.

See [auth-recipes/pattern-c-msa.md](./auth-recipes/pattern-c-msa.md) for the
step-by-step split from Pattern B.

## Decision matrix

| Axis                  | Pattern A       | Pattern B (default) | Pattern C (MSA)      |
| --------------------- | --------------- | ------------------- | -------------------- |
| Services running auth | 1 (web)         | 1 (api)             | 1 (auth-service)     |
| Session owner         | web             | api                 | auth-service         |
| Typical client count  | 1 (web only)    | 1–N (web + mobile)  | N services + N apps  |
| MSA migration cost    | High (rewrite)  | Low (copy)          | Already MSA          |
| Cross-service auth    | n/a             | in-process          | service-auth JWT     |
| Ops surface           | 1 deploy        | 1 deploy            | 2+ deploys           |

## What stays identical across A/B/C

- `packages/auth` contracts (session, identity, permissions, service-auth)
- `packages/auth-server` factory (`createAuth`)
- Database schema in `packages/db` (user, session, account, verification)
- `.env.example` auth variables

## What changes between A/B/C

| Change              | A              | B (default)     | C                   |
| ------------------- | -------------- | --------------- | ------------------- |
| `createAuth` import | `apps/web`     | `apps/api`      | `apps/auth-service` |
| `/auth/*` lives in  | Next.js routes | NestJS controller | dedicated service |
| Session validation  | Next or api DB | NestJS AuthGuard | HTTP + service-auth |

## How to switch

- B → A: see [auth-recipes/pattern-a-web-mount.md](./auth-recipes/pattern-a-web-mount.md)
- B → C: see [auth-recipes/pattern-c-msa.md](./auth-recipes/pattern-c-msa.md)
- A → B: revert A recipe, wire up NestJS (default template state)
- A → C: combine A recipe undo + C recipe

In every case `packages/auth` and `packages/auth-server` remain unchanged.

## SSO support

The runtime ships with `@better-auth/sso` active by default. That covers:

- **OIDC** — Okta, Auth0, Keycloak, Azure AD, any `.well-known/openid-configuration` IdP
- **SAML 2.0** — enterprise IdPs requiring assertion-based sign-in
- **Domain-based matching** — user enters email, Better Auth finds the right IdP
- **Optional domain verification** — TXT-record challenge before trusting a domain
- **Per-organization providers** — `organization_id` column is provisioned (FK lands with the Organization model in a later phase)

See [auth-recipes/sso-provider-registration.md](./auth-recipes/sso-provider-registration.md)
for the REST flow to register OIDC and SAML providers. Disable the plugin
with `createAuth({ sso: { disabled: true } })` if a project will never use
enterprise SSO — this avoids the ~20MB `samlify` transitive dep.

SSO works identically under Pattern A, B, and C — the plugin is mounted by
`packages/auth-server`, not by any specific host app.
