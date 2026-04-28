import { type TenantContext, tenantHeaderName } from "@repo/contracts";
import type { TenantResolver } from "@repo/infrastructure";
import { runWorkflow, withLoggerContext, withTenantContext } from "@repo/platform";
import type { NextFunction, Request, Response } from "express";

/**
 * Per-request tenant middleware. Mounted globally in `main.ts` after the
 * request-id middleware so log lines emitted inside a tenant scope
 * carry both `requestId` and `tenantId`.
 *
 * The resolver is injected (DI'd from `TenantModule.TENANT_RESOLVER`).
 * Default is `noopTenantResolver`, which always returns `null` — solo
 * deploys pay one Effect microtask per request and no scope is opened.
 *
 * On a non-null resolution the middleware wraps the rest of the request
 * handler in `withTenantContext` (so `getTenantContext()` reads the
 * tenant in domain code) and `withLoggerContext` (so log lines pick up
 * `tenantId` automatically). On a resolver failure (`AppError`) the
 * error flows through `next(err)` and the global `AppErrorFilter` maps
 * it onto the canonical envelope.
 *
 * Header convention: the request is forwarded as-is to the resolver,
 * which decides what signal to read. The conventional `x-tenant-id`
 * header constant is exported from `@repo/contracts/tenant.ts` for
 * resolvers that want it.
 */
export function createTenantMiddleware(resolver: TenantResolver) {
  return function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
    runWorkflow(resolver.resolveTenant(req))
      .then((tenant: TenantContext | null) => {
        if (!tenant) {
          next();
          return;
        }
        withTenantContext(tenant, () => {
          withLoggerContext({ tenantId: tenant.tenantId }, () => {
            next();
          });
        });
      })
      .catch((err) => {
        next(err);
      });
  };
}

// Re-export the conventional header name so consumers wiring a real
// header-based resolver have one import path.
export { tenantHeaderName };
