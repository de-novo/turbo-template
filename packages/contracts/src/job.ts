import { z } from "zod";
import { idSchema } from "./ids.js";
import { tenantIdSchema } from "./tenant.js";

/**
 * Demand-driven deferred-work contract: image resize, batch import, send
 * email later, run a webhook callback. Distinct from `@nestjs/schedule`
 * (cron — fires on a clock) and from the outbox (event publishing — the
 * relay forwards already-decided messages). A job is a unit of *work* with
 * its own retry / scheduling / idempotency lifecycle.
 *
 * The runtime port is in `@repo/infrastructure/queue.ts`. Real backends —
 * BullMQ, Inngest, SQS, Cloud Tasks — plug in by implementing `JobQueue`.
 * See ADR docs/adr/0007-job-queue-contract.md.
 */

export const jobStatusSchema = z.enum(["pending", "running", "succeeded", "failed"]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/**
 * Producer-side shape: the application enqueues this. `name` is the job
 * type ("notes.image.resize", "user.welcome.email") — workers route on it.
 * `idempotencyKey` lets the queue drop duplicates if the same logical job
 * is enqueued twice (network retry, double-clicked button). `scheduledFor`
 * defers execution until the given ISO timestamp.
 */
export const jobDescriptorSchema = z.object({
  name: z.string().min(1),
  payload: z.unknown(),
  idempotencyKey: z.string().min(1).optional(),
  scheduledFor: z.string().datetime().optional(),
  maxAttempts: z.number().int().positive().default(3),
  tenantId: tenantIdSchema.optional(),
});
export type JobDescriptor = z.infer<typeof jobDescriptorSchema>;

/**
 * Queue-side shape: what the worker claims. Carries the descriptor plus
 * runtime fields (id, attempt count, status). `attempt` starts at 1 on
 * first claim.
 */
export const jobRecordSchema = jobDescriptorSchema.extend({
  id: idSchema,
  status: jobStatusSchema,
  attempt: z.number().int().positive(),
  enqueuedAt: z.string().datetime(),
  lastError: z.string().optional(),
});
export type JobRecord = z.infer<typeof jobRecordSchema>;

export const jobResultSchema = z.object({
  id: idSchema,
  status: jobStatusSchema,
  attempt: z.number().int().positive(),
});
export type JobResult = z.infer<typeof jobResultSchema>;
