# 0013 — Tenant middleware: global mount, resolver-pluggable, noop default

- **Status**: Accepted
- **Date**: 2026-04-28
- **Builds on**: [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md)

## Context

ADR [0004](./0004-multi-tenancy-contract.md) shipped the multi-tenancy _contract_ — `TenantContext`
schema in `@repo/contracts`, `withTenantContext` ALS in `@repo/platform`, `TenantResolver` port in
`@repo/infrastructure` — but explicitly deferred the API-side middleware that would call the
resolver and seed the ALS scope. The deferral was on purpose: doing the wiring without a real
resolver to test against would have baked assumptions into middleware shape (where to read the
request, what to do on resolution failure) that the first real consumer should drive.

After exercising the contract through the rest of Group A (outbox, policy, queue, notifier, storage,
audit), the wiring shape is now clear enough to land. The ADRs for those ports all carry `tenantId`
_through_ the data — but none of them _seed_ the ALS. Without a middleware, every fork that wires a
real resolver has to write the same boilerplate (read header, call resolver, wrap next() in
`withTenantContext`). That's exactly the reusable shape this template should ship.

## Decision

Mount a single global tenant middleware in `apps/api/src/main.ts` using a DI-injected resolver.
Defaults to `noopTenantResolver` — solo deploys pay one Effect microtask per request and no ALS
scope is opened.

- **Module** — `apps/api/src/tenant/tenant.module.ts` provides the `TENANT_RESOLVER` token with
  `useValue: noopTenantResolver`. A fork swaps the provider value (or switches to `useFactory` for a
  resolver that needs DI itself, e.g. one reading the DB).
- **Middleware factory** — `apps/api/src/tenant/tenant.middleware.ts` exports
  `createTenantMiddleware(resolver)`. The factory pattern keeps the middleware function pure and
  testable — no Nest DI inside the middleware itself.
- **Mount order** — `main.ts` mounts the middleware **after** `requestIdMiddleware` (so log lines
  emitted inside a tenant scope carry both `requestId` and `tenantId`) and **before**
  `requestLoggerMiddleware` (so the per-request access log line picks up `tenantId` automatically
  through `withLoggerContext`).
- **Resolution semantics** — the resolver receives the raw Express `Request`. On `null`, the
  middleware calls `next()` without opening a scope. On a `TenantContext`, the middleware wraps
  `next()` in `withTenantContext(ctx, () => withLoggerContext({ tenantId: ctx.tenantId }, next))`.
  On `Effect.fail(AppError)`, the error flows through `next(err)` and the global `AppErrorFilter`
  maps it onto the canonical envelope.

The conventional `x-tenant-id` header constant (`tenantHeaderName` from `@repo/contracts/tenant.ts`)
is re-exported from the middleware module for resolvers that want it; the middleware itself doesn't
read any specific header — it forwards the whole request to the resolver and lets the resolver
decide.

## Consequences

- **Benefits**:
  - Activation is a single PR: write a `TenantResolver` against the chosen signal (subdomain /
    `x-tenant-id` header / JWT claim / membership lookup), swap the `TenantModule` provider's
    `useValue`, remove the deferred entry from `docs/capabilities.md`. No middleware change, no
    `main.ts` change, no per-controller wiring.
  - Every log line emitted inside a tenant scope auto-carries `tenantId` once a real resolver is
    wired. The `LoggerContext` field added in ADR 0004 finally serves its purpose.
  - The same wiring covers all downstream contracts: outbox writes, audit entries, policy decisions,
    notifier sends — anything that reads `getTenantContext()` works as soon as the middleware seeds
    the scope.
  - Tests for the middleware (`tenant.middleware.test.ts`) cover the four cases (noop, success,
    failure, nested scopes) without spinning up a full Nest application.
- **Costs**:
  - One `Effect.runPromiseExit` per request even when the resolver is `noopTenantResolver`. Measured
    cost: a single microtask plus Effect's overhead — invisible against an Express request that's
    already async, but technically not zero. Worth it for the wiring consistency.
  - The middleware is unconditionally mounted, including on `/health/*` and `/metrics`. With the
    noop resolver this is harmless; with a real resolver, probes / scrapers don't need a tenant
    scope and get one anyway. Forks can short-circuit inside the resolver
    (`if (request.path.startsWith("/health")) return Effect.succeed(null)`) — a per-request branch
    is cheaper than a per-route mount config.
- **Risks / open questions**:
  - The middleware is mounted in `main.ts` rather than registered via `NestModule.configure` because
    Express middleware ordering interacts with Better Auth's
    `expressApp.all("/api/auth/*splat", ...)` mount, which also lives in `main.ts`. Keeping the
    wiring in one file makes the order obvious. A future refactor that hoists everything into a
    single `BootstrapModule` should preserve the request-id → tenant → logger order.
  - This ADR doesn't mount middleware for `apps/web`. The web app isn't tenancy-aware today; if a
    fork adds tenant routing on the web side (subdomain), they'll need a Next.js middleware that
    seeds the same `withTenantContext` from `@repo/platform`. A future recipe will document the
    pattern.

## Alternatives considered

- **Per-controller middleware via `@UseGuards` or `@Injectable` middleware**: rejected. Tenancy is
  cross-cutting — opt-out per route is simpler than opt-in per route. Forgetting `@UseGuards` on a
  new controller is a silent tenant-isolation bug; the middleware approach makes that impossible.
- **Read the `x-tenant-id` header directly in the middleware (skip the resolver port)**: rejected.
  Forecloses on subdomain-based, JWT-based, and membership-lookup-based resolution strategies. The
  resolver port is the abstraction; the middleware honors it.
- **Defer until `apps/api` has a tenant-aware domain module to exercise**: rejected at this point.
  The resolver shape is stable (per ADR 0004), the middleware shape is the natural mirror, and
  shipping it now lets the _next_ ADR (a tenant-aware reference domain module, when one lands) skip
  re-litigating the wiring.
- **Mount the middleware after `requestLoggerMiddleware`**: rejected. The access-log line would not
  carry `tenantId` because the logger context is captured inside the request scope, and the access
  log reads it via `getLoggerContext()` after the response finishes. The current order (request-id →
  tenant → logger) is the only one that produces fully-labeled access logs.

## References

- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — parent contract
- `apps/api/src/tenant/tenant.module.ts` — DI module
- `apps/api/src/tenant/tenant.middleware.ts` — middleware factory
- `apps/api/src/tenant/tenant.middleware.test.ts` — unit tests
- `apps/api/src/main.ts` — mount point
- `docs/recipes/enable-multi-tenancy.md` — fork-time activation guide
- `packages/infrastructure/src/tenant.ts` — `TenantResolver` port
- `packages/platform/src/tenant-context.ts` — `withTenantContext` ALS
