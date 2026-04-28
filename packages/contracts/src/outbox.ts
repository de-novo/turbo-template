import { z } from "zod";
import { eventMetadataSchema } from "./events.js";
import { idSchema } from "./ids.js";
import { tenantIdSchema } from "./tenant.js";

/**
 * Runtime-validated shape of a row in the transactional outbox table
 * (`packages/db/src/schema/outbox.ts`). Used by the relay (claim, mark
 * published, mark failed) and any consumer that introspects pending work.
 *
 * `tenantId` is optional: system events fire outside any tenant scope.
 * `metadata` is the same shape that wraps `DomainEvent`, so an outbox row
 * carries enough provenance (eventId, occurredAt, correlationId,
 * causationId) to be replayed after a relay restart. See ADR
 * docs/adr/0005-outbox-contract.md.
 */

export const outboxEntrySchema = z.object({
  id: idSchema,
  topic: z.string().min(1),
  eventName: z.string().min(1),
  eventVersion: z.string().min(1).default("1"),
  payload: z.unknown(),
  metadata: eventMetadataSchema,
  tenantId: tenantIdSchema.optional(),
  createdAt: z.string().datetime(),
  publishedAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
  attemptCount: z.number().int().nonnegative().default(0),
});

export const newOutboxEntrySchema = outboxEntrySchema.pick({
  topic: true,
  eventName: true,
  eventVersion: true,
  payload: true,
  metadata: true,
  tenantId: true,
});

export type OutboxEntry = z.infer<typeof outboxEntrySchema>;
export type NewOutboxEntry = z.infer<typeof newOutboxEntrySchema>;
