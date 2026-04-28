import { z } from "zod";
import { idSchema, slugSchema } from "./ids.js";

/**
 * Request-scoped tenant identity for data isolation, audit attribution, and
 * observability labels. This is the tenancy *contract* — the resolution
 * strategy (subdomain / `x-tenant-id` header / JWT claim / membership lookup)
 * is a deliberate consumer choice. See
 * docs/adr/0004-multi-tenancy-contract.md.
 *
 * Distinct from `organizationMembership` in `@repo/auth/identity`:
 * `tenantId` is the request-scoped data-isolation key; `organizationId` is a
 * property of a user identity (membership / billing). They are commonly 1:1
 * in product code, but the contracts stay separate so a fork can diverge
 * them (e.g. workspace-as-tenant nested under one billing org).
 */

export const tenantIdSchema = idSchema.brand<"TenantId">();
export type TenantId = z.infer<typeof tenantIdSchema>;

export const tenantContextSchema = z.object({
  tenantId: tenantIdSchema,
  tenantSlug: slugSchema.optional(),
});
export type TenantContext = z.infer<typeof tenantContextSchema>;

/**
 * Conventional HTTP header for explicit tenant assertion. The platform does
 * not read this by default — opt-in by registering a `TenantResolver`
 * (see `@repo/infrastructure`).
 */
export const tenantHeaderName = "x-tenant-id";
