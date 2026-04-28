import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Transactional outbox staging table. Domain code that needs an
 * exactly-once side-effect (publish to a bus, send a webhook, enqueue a
 * background job) writes to this table inside the same DB transaction as
 * its business mutation, then a separate relay process drains pending rows
 * and forwards them to the real publisher.
 *
 * The table is the *contract*; the relay is the implementation. The default
 * relay is in-memory (`createMemoryOutboxRelay` in `@repo/infrastructure`)
 * for tests; production deployments pick a strategy — Postgres
 * `LISTEN/NOTIFY` worker, polling worker, or Debezium CDC. See ADR
 * docs/adr/0005-outbox-contract.md.
 *
 * `tenantId` mirrors `@repo/contracts/tenant`'s `TenantId` (request-scoped
 * data isolation); nullable because system events (no tenant scope) are
 * legitimate. Distinct from `system_events`, which is an audit log of
 * already-fired events with no publish lifecycle.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topic: text("topic").notNull(),
    eventName: text("event_name").notNull(),
    eventVersion: text("event_version").notNull().default("1"),
    payload: jsonb("payload").notNull(),
    metadata: jsonb("metadata").notNull(),
    tenantId: text("tenant_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastError: text("last_error"),
    attemptCount: integer("attempt_count").notNull().default(0),
  },
  (table) => [
    index("outbox_pending_idx").on(table.publishedAt, table.createdAt),
    index("outbox_tenant_idx").on(table.tenantId),
  ],
);

export type OutboxRow = typeof outbox.$inferSelect;
export type NewOutboxRow = typeof outbox.$inferInsert;
