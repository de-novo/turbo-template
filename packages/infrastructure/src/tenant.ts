import type { TenantContext } from "@repo/contracts";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";

/**
 * Maps a request-shaped input to a tenant context. The shape of `request`
 * is intentionally `unknown` so adapters can narrow it to whatever they
 * receive (Express `Request`, `NextRequest`, fetch `Request`, RPC envelope)
 * without coupling this contract to a transport. A resolver returns `null`
 * when the request carries no tenant assertion (single-tenant deploys,
 * public endpoints).
 *
 * Default: `noopTenantResolver` always returns `null`. Activation is a
 * deliberate fork choice — subdomain, `x-tenant-id` header, JWT claim, or
 * membership lookup — see docs/adr/0004-multi-tenancy-contract.md.
 */
export type TenantResolver = {
  resolveTenant(request: unknown): Effect.Effect<TenantContext | null, AppError>;
};

export const noopTenantResolver: TenantResolver = {
  resolveTenant: () => Effect.succeed(null),
};
