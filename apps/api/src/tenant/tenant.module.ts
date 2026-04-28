import { Module } from "@nestjs/common";
import { noopTenantResolver } from "@repo/infrastructure";
import { TENANT_RESOLVER } from "./tenant.tokens.js";

/**
 * Provides the active `TenantResolver` for the request-scoped tenant
 * middleware (see `tenant.middleware.ts`). The default is
 * `noopTenantResolver` — a fork enabling multi-tenancy swaps this
 * provider's `useValue` (or `useFactory`) for a real resolver
 * implementation.
 *
 * The resolver port itself lives in `@repo/infrastructure/tenant.ts`
 * (per ADR 0004 — multi-tenancy contract). This module is the
 * application-side wiring (per ADR 0013).
 */
@Module({
  providers: [
    {
      provide: TENANT_RESOLVER,
      useValue: noopTenantResolver,
    },
  ],
  exports: [TENANT_RESOLVER],
})
export class TenantModule {}
