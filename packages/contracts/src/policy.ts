import { z } from "zod";
import { idSchema } from "./ids.js";
import { tenantIdSchema } from "./tenant.js";

/**
 * Authorization contract. The runtime evaluator port lives in
 * `@repo/infrastructure/policy.ts`; this module ships only the data shapes
 * so that controllers, command handlers, and audit code can frame the
 * question — "may this subject perform this action on this resource?" —
 * without picking an engine.
 *
 * Distinct from `@repo/auth/permissions.ts`: that module declares the
 * permission *names* (e.g. `license:read`); this module declares the
 * *evaluation* contract (subject + action + resource + decision). A solo
 * deploy can implement role/permission checks in a few lines via
 * `createMemoryPolicyEvaluator`; an enterprise deploy plugs in CASL,
 * Cedar, OPA, or a custom service. See ADR
 * docs/adr/0006-policy-port.md.
 */

export const policyDecisionSchema = z.enum(["allow", "deny"]);
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;

export const policySubjectSchema = z.object({
  userId: idSchema,
  roles: z.array(z.string().min(1)).default([]),
  tenantId: tenantIdSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});
export type PolicySubject = z.infer<typeof policySubjectSchema>;

/**
 * `kind` is a stable resource type ("notes", "license", "user"); `id` is
 * the specific instance (omit for collection-scoped actions like "list").
 * `attributes` carries per-resource ABAC inputs (ownerId, status,
 * classification) — keep keys stable across rule files.
 */
export const policyResourceSchema = z.object({
  kind: z.string().min(1),
  id: idSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});
export type PolicyResource = z.infer<typeof policyResourceSchema>;

/**
 * Action strings are namespaced verbs: `<resource>:<verb>` for
 * resource-scoped actions (`notes:read`, `license:write`) and `<area>:*`
 * for area-wide grants. The schema does not enforce the namespace —
 * conventions belong to consumer codebases — but evaluators should treat
 * it as opaque.
 */
export const policyActionSchema = z.string().min(1);
export type PolicyAction = z.infer<typeof policyActionSchema>;

export const policyQuerySchema = z.object({
  subject: policySubjectSchema,
  action: policyActionSchema,
  resource: policyResourceSchema,
  context: z.record(z.string(), z.unknown()).optional(),
});
export type PolicyQuery = z.infer<typeof policyQuerySchema>;
