# Enable multi-tenancy

The template ships the multi-tenancy contract (per ADR
[0004](../adr/0004-multi-tenancy-contract.md)) and a global tenant middleware (per ADR
[0013](../adr/0013-tenant-middleware-wiring.md)). Default is `noopTenantResolver` — the middleware
runs but never opens a scope, so the lane is inert until you wire a real resolver.

This recipe walks through activation. Three pieces change: (1) write a real resolver, (2) swap the
`TenantModule` provider, (3) update domain code that should respect tenant scope. Steps 1 and 2 are
the same for every activation; step 3 is per-module.

## When this applies

You're adding the second tenant to a single-tenant deployment, or launching a multi-tenant SaaS
where every request must be scoped to the calling tenant. Indicators:

- You have (or are about to add) a `tenant_id` column on user-facing tables.
- You have (or are about to add) a `tenants` table with billing / isolation rows.
- A breach in one customer's data must not surface in another's query results.
- Logs / metrics / audit need to be filterable by tenant.

If your fork is single-tenant by design (an internal tool, a personal product), don't activate this
— leave `noopTenantResolver` in place and skip the recipe.

## Step 1 — Pick a resolution signal

Each strategy has trade-offs. Pick one and document it in your fork's `docs/api/README.md` so
consumers know what to send.

| Signal               | Trade-off                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-tenant-id` header | Most explicit; client controls the tenant. Requires every client (web, mobile, internal tools, integrations) to know to send the header.        |
| Subdomain            | `acme.app.example.com` → tenant `acme`. Visible in URL, plays well with cookies. Requires DNS + certificate per tenant or wildcard cert.        |
| JWT claim            | The session token carries the tenant. Strong: tenant cannot be spoofed by a malicious client. Requires the auth flow to bind the user → tenant. |
| Membership lookup    | Look up the user's primary org / workspace / tenant from the session. Strongest binding; one network hop per request unless cached.             |

The shipped resolver port is `unknown`-typed — your resolver can read any of these from the Express
`Request` object.

## Step 2 — Write the resolver

Create `apps/api/src/tenant/header-tenant-resolver.ts` (filename is a hint; pick whatever fits).
Implement the `TenantResolver` interface from `@repo/infrastructure`:

```ts
import { type TenantContext, tenantHeaderName, tenantIdSchema } from "@repo/contracts";
import type { TenantResolver } from "@repo/infrastructure";
import { AppError } from "@repo/platform";
import { Effect } from "effect";
import type { Request } from "express";

export const headerTenantResolver: TenantResolver = {
  resolveTenant: (request) =>
    Effect.sync(() => {
      const req = request as Request;
      const raw = req.headers[tenantHeaderName];
      if (typeof raw !== "string" || raw.length === 0) {
        return null; // no header → no tenant scope
      }
      const parsed = tenantIdSchema.safeParse(raw);
      if (!parsed.success) {
        throw new AppError({
          code: "BAD_REQUEST",
          message: `Invalid ${tenantHeaderName} header.`,
        });
      }
      const context: TenantContext = { tenantId: parsed.data };
      return context;
    }),
};
```

For a subdomain resolver, swap the `req.headers[...]` read for `req.hostname.split(".")[0]`. For a
JWT-claim resolver, decode the session token from the `Authorization` header. For a membership-
lookup resolver, inject the DB client and query the `users` table.

## Step 3 — Swap the `TenantModule` provider

Edit `apps/api/src/tenant/tenant.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { TENANT_RESOLVER } from "./tenant.tokens.js";
import { headerTenantResolver } from "./header-tenant-resolver.js";

@Module({
  providers: [
    {
      provide: TENANT_RESOLVER,
      useValue: headerTenantResolver,
    },
  ],
  exports: [TENANT_RESOLVER],
})
export class TenantModule {}
```

That's the activation. The middleware in `main.ts` picks up the new resolver via DI on the next boot
— no `main.ts` change required.

## Step 4 — Make domain code tenant-aware

The middleware seeds `withTenantContext` (so domain code reads `getTenantContext()`) and
`withLoggerContext({ tenantId })` (so log lines auto-label). Domain code now has to _use_ the scope.

For each module that touches user-facing data:

```ts
import { getTenantContext } from "@repo/platform";
import { eq } from "drizzle-orm";

async list(query: ListNotesQuery) {
  const tenant = getTenantContext();
  if (!tenant) {
    throw new AppError({ code: "BAD_REQUEST", message: "Tenant required." });
  }
  return this.db.select().from(notes).where(eq(notes.tenantId, tenant.tenantId));
}
```

The decision "what to do when there's no tenant" is product-specific:

- **Strict**: throw `BAD_REQUEST` so the request 4xx's. Forces every caller to send the tenant
  signal. Use this for a B2B SaaS where unsigned requests have no business reaching the API.
- **Cross-tenant for service accounts**: skip the filter when `getLoggerContext()?.userId` is a
  known service principal (admin dashboards, internal jobs). Document the exception in the route's
  MD file.
- **Public endpoints**: don't read tenant scope at all (e.g. `/health/*`, `/metrics`, marketing-page
  server actions).

The contracts in `@repo/contracts/outbox`, `audit`, `notification`, `job` already carry an optional
`tenantId` field — your handler populates it from `getTenantContext()` when it writes.

## Step 5 — Add per-route tenant docs

Update `docs/api/<resource>.md` for every module that became tenant-aware. The routes table grows a
column or the auth-posture section grows a paragraph: "Requires `x-tenant-id` header (or whatever
signal you picked). Returns `BAD_REQUEST` when missing. Responses are scoped to the calling tenant."

The recipe at [`docs/recipes/document-an-api-route.md`](./document-an-api-route.md) is the
convention.

## Step 6 — Remove the deferred-capabilities entry

Edit `docs/capabilities.md` and delete the **Real tenant resolution strategy** bullet under
"Deferred capabilities". The lane is now real; the deferred list should reflect that.

## Step 7 — Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm --filter @repo/api dev

# Send a request without the header — should 4xx (if you chose strict):
curl -i http://localhost:4000/notes

# Send a request with the header — should 200 and scope to that tenant:
curl -H 'x-tenant-id: tenant-1' http://localhost:4000/notes
```

Watch the access log line — it should now carry `tenantId` in `details` for any request where the
resolver opened a scope.

## What you don't have to do

- **Touch the middleware itself.** It's the same code; you only changed the resolver behind it.
- **Touch `main.ts`.** The DI lookup picks up the new provider automatically.
- **Migrate `system_events` or `outbox`.** Both already carry an optional `tenant_id` column;
  populating it on insert is a service- layer change.
- **Decide between cookie-based and header-based session tracking.** That's auth-recipe territory,
  not tenant-recipe territory.

## Common pitfalls

- **Forgetting the strict-vs-soft default**. If your domain code reads `getTenantContext()` and
  doesn't check the result, a request without the header silently runs unscoped — and may leak data
  across tenants. Pick a default at the resolver layer (return null vs throw) and _also_ check at
  the boundary in service code.
- **OpenTelemetry resource labels**. If your fork enables OTel, the span attributes don't auto-carry
  `tenantId` — you'll want to add a span processor that pulls from `getTenantContext()` and tags
  spans with `tenant.id`.
- **Cache keys**. If your fork wires a real `CacheStore` (`@repo/infrastructure`), every cache key
  needs a tenant prefix. A wrapper `tenantScopedCache(cache)` is the easiest pattern.
- **Background jobs**. Jobs enqueued via `@repo/contracts/job` carry an optional `tenantId` —
  workers must `withTenantContext` around the handler so downstream queries also scope correctly.

## References

- ADR [0004 — Multi-tenancy contract](../adr/0004-multi-tenancy-contract.md)
- ADR [0013 — Tenant middleware wiring](../adr/0013-tenant-middleware-wiring.md)
- `apps/api/src/tenant/` — module, middleware, tests
- `packages/contracts/src/tenant.ts` — `TenantContext`, `TenantId`, `tenantHeaderName`
- `packages/platform/src/tenant-context.ts` — `withTenantContext` / `getTenantContext`
- `packages/infrastructure/src/tenant.ts` — `TenantResolver` port + `noopTenantResolver`
