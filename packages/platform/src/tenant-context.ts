import { AsyncLocalStorage } from "node:async_hooks";
import type { TenantContext } from "@repo/contracts";

/**
 * Request-scoped tenant context, parallel to `LoggerContext`. Read by
 * domain code that needs to scope queries / events / audit entries to the
 * current tenant. Writers (typically API middleware that runs a
 * `TenantResolver`) call `withTenantContext` to seed the ALS for the
 * downstream handler chain.
 *
 * Default behavior is single-tenant: nothing is seeded, `getTenantContext`
 * returns `undefined`, and consumer code can either treat the absence as
 * "no isolation needed" or assert tenancy at its own boundary. See
 * docs/adr/0004-multi-tenancy-contract.md.
 */

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function withTenantContext<T>(context: TenantContext, fn: () => T): T {
  return tenantContextStorage.run(context, fn);
}

export function getTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}
