/**
 * DI token for the active `TenantResolver`. Default value is
 * `noopTenantResolver` (provided by `TenantModule`); a fork swaps the
 * provider value to a real resolver — see
 * `docs/recipes/enable-multi-tenancy.md`.
 */
export const TENANT_RESOLVER = "TENANT_RESOLVER";
