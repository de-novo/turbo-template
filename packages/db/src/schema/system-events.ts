import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const systemEvents = pgTable(
  "system_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: text("event_name").notNull(),
    eventVersion: text("event_version").notNull().default("1"),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    correlationId: text("correlation_id"),
  },
  (table) => [index("system_events_event_name_idx").on(table.eventName)],
);

export type SystemEvent = typeof systemEvents.$inferSelect;
export type NewSystemEvent = typeof systemEvents.$inferInsert;
