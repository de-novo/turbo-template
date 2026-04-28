# 0004 — Multi-tenancy contract, resolution deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

The template targets the full range from solo product to enterprise SaaS. Multi-tenancy is the
single feature whose absence at day one forces the most painful retrofit later: adding a `tenant_id`
to every query, every domain event, every audit row, and every log line after a codebase has grown
is a cross-cutting refactor that touches almost every package.

At the same time, picking a _resolution strategy_ (subdomain, `x-tenant-id` header, JWT claim,
membership lookup) at template time is a hard bias. A solo deploy is single-tenant and shouldn't pay
for a resolver; an enterprise B2B product wants header-based explicit assertion; a consumer SaaS
wants subdomain isolation; a workspace product wants membership lookup against the session. ADR
[0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) is in force: ship the contract,
defer the implementation.

`@repo/auth/identity` already models `organizationMembership`. That is a property of a _user_
(membership / billing). It is **not** the same axis as data isolation. Conflating them forecloses on
workspace-as-tenant or workspace-under-org topologies that real products commonly grow into.

## Decision

Ship the multi-tenancy contract across three layers, with a no-op default and the resolution
strategy as a deliberate consumer choice.

- **Schema** — `@repo/contracts/tenant.ts` exports `tenantIdSchema` (branded `TenantId`),
  `tenantContextSchema` (`{ tenantId, tenantSlug? }`), and the conventional header constant
  `tenantHeaderName = "x-tenant-id"`. No runtime; pure Zod, like every other `@repo/contracts`
  module.
- **Request-scoped context** — `@repo/platform/tenant-context.ts` exports `withTenantContext` /
  `getTenantContext`, mirroring `withLoggerContext`. `LoggerContext` also gains an optional
  `tenantId` field so every log line emitted inside a tenant scope is labeled for free once a
  resolver is wired.
- **Resolver port** — `@repo/infrastructure/tenant.ts` defines the `TenantResolver` interface
  (`Effect.Effect<TenantContext | null, AppError>`) and ships `noopTenantResolver` (always returns
  `null`). The `request` argument is `unknown` so adapters can narrow it to whatever transport they
  receive (Express, NextRequest, RPC envelope) without coupling the contract to a framework.

`@repo/auth` stays pure-schema (no runtime, no Effect dep). `organizationId` and `tenantId` remain
separate types in the contracts; product code that treats them as 1:1 does so explicitly.

## Consequences

- **Benefits**:
  - Domain code can read `getTenantContext()` today and stay correct when a real resolver is wired
    tomorrow — no API surface change. Adding `tenantId` to a Drizzle table or domain event payload
    is a localized change rather than a cross-cutting one.
  - Logs are tenancy-aware as soon as a resolver lands: the field already exists on `LoggerContext`,
    so no log-line rewrite is needed.
  - Solo deploys pay nothing — `noopTenantResolver` returns `null`, no ALS scope is opened, and
    `getTenantContext()` returns `undefined`.
  - Enterprise activation is a single PR: write a resolver against the chosen signal, mount it in
    API middleware via `withTenantContext`, and remove the deferred entry from
    `docs/capabilities.md`.
- **Costs**:
  - Domain code that depends on tenancy must decide its own posture when `getTenantContext()` is
    `undefined` (treat as "no isolation needed", or assert and 4xx). The template does not pick that
    boundary; the recipe will, when the recipe lands.
  - The branded `TenantId` type means existing `string` ids that should be tenant ids will not
    type-check until they pass through `tenantIdSchema.parse()`. Intentional: the cost is the point.
- **Risks / open questions**:
  - The relationship between `organizationId` (`@repo/auth/identity`) and `tenantId`
    (`@repo/contracts/tenant`) is left to the consumer. A future ADR may codify a default mapping if
    a clear pattern emerges across forks.
  - The API middleware that mounts the resolver is **not** yet shipped. That is a deliberate
    follow-up: doing it without a real resolver to test against would bake assumptions into
    middleware shape (where to read the request, what to do on resolution failure) that the first
    real consumer should drive.

## Alternatives considered

- **Reuse `organizationId` as the tenant key directly**: rejected. Forecloses on workspace-as-tenant
  topologies, conflates billing/membership with data isolation, and means every fork that wants
  different axes has to refactor instead of compose.
- **Ship a real resolver (e.g. subdomain) by default**: rejected per ADR 0001. Picks for the fork;
  baking subdomain assumptions into env shape and middleware now is exactly the day-one-overreach
  failure mode.
- **Skip the contract until a real resolver lands**: rejected. The whole reason to ship the contract
  early is so domain code written _before_ multi-tenancy is activated lands in the right shape.
  Adding `tenantId` to a 50-table schema after the fact is the failure mode this template explicitly
  tries to avoid.
- **Put the resolver port in `@repo/auth`**: rejected. `@repo/auth` is pure Zod (no Effect, no
  runtime). The resolver is an Effect-typed I/O port; that's `@repo/infrastructure`'s
  responsibility, alongside `EventPublisher`, `CacheStore`, and friends.

## References

- `packages/contracts/src/tenant.ts` — schema + brand + header constant
- `packages/platform/src/tenant-context.ts` — request-scoped ALS
- `packages/platform/src/logger.ts` — `LoggerContext.tenantId` field
- `packages/infrastructure/src/tenant.ts` — `TenantResolver` port + `noopTenantResolver`
- `packages/auth/src/identity.ts` — `organizationMembership` (separate axis, by design)
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- `docs/capabilities.md` — deferred-capabilities entry for "real tenant resolution strategy"
