import { z } from "zod";
import { idSchema } from "./ids.js";
import { tenantIdSchema } from "./tenant.js";

/**
 * Audit-event contract: a structured record of "who did what to which
 * resource, with what outcome, when". Distinct from `system_events`
 * (operational telemetry) and from the outbox (publish lifecycle for
 * domain events): an audit entry is the *forensic record* a compliance
 * reviewer or incident responder reads to reconstruct a history.
 *
 * The runtime sink port is in `@repo/infrastructure/audit.ts`. Real
 * persistence — a DB-backed `audit_events` table, SIEM forwarding to
 * Splunk / Datadog / CloudWatch, immutable WORM storage — is a fork
 * choice. See ADR docs/adr/0010-audit-sink-contract.md.
 *
 * Naturally composes with `policy` (every denied policy decision is an
 * audit candidate) and `outbox` (audit entries can ride the outbox for
 * async durable forwarding instead of synchronous DB writes).
 */

export const auditOutcomeSchema = z.enum(["success", "failure", "denied"]);
export type AuditOutcome = z.infer<typeof auditOutcomeSchema>;

/**
 * Either a human user or a service account performed the action. Both
 * fields are optional — system-initiated actions (scheduled job tick,
 * recovery script) may have neither and should set `serviceName` to a
 * stable label like `"jobs-runner"`.
 */
export const auditActorSchema = z.object({
  userId: idSchema.optional(),
  serviceName: z.string().min(1).optional(),
  roles: z.array(z.string().min(1)).default([]),
  tenantId: tenantIdSchema.optional(),
});
export type AuditActor = z.infer<typeof auditActorSchema>;

export const auditResourceSchema = z.object({
  kind: z.string().min(1),
  id: idSchema.optional(),
});
export type AuditResource = z.infer<typeof auditResourceSchema>;

/**
 * Server-assigned shape (as persisted). `action` is namespaced —
 * `auth.signin`, `notes.create`, `data.export` — convention not enforced
 * by the schema. `requestId` and `correlationId` link back to the
 * originating request log line and the broader trace.
 */
export const auditEntrySchema = z.object({
  id: idSchema,
  occurredAt: z.string().datetime(),
  actor: auditActorSchema,
  action: z.string().min(1),
  resource: auditResourceSchema.optional(),
  outcome: auditOutcomeSchema,
  requestId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

/**
 * Caller-supplied shape: omit the server-assigned `id` and `occurredAt`.
 * The sink stamps both during `record()`.
 */
export const newAuditEntrySchema = auditEntrySchema.omit({ id: true, occurredAt: true });
export type NewAuditEntry = z.infer<typeof newAuditEntrySchema>;
