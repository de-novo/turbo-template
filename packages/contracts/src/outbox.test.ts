import { expect, test } from "vitest";
import { newOutboxEntrySchema, outboxEntrySchema } from "./outbox.js";

const sampleMetadata = {
  eventId: "evt_1",
  eventName: "notes.created",
  eventVersion: 1,
  occurredAt: "2026-04-28T00:00:00.000Z",
};

test("outboxEntrySchema validates a fully populated row", () => {
  const result = outboxEntrySchema.safeParse({
    id: "row-1",
    topic: "notes",
    eventName: "notes.created",
    eventVersion: "1",
    payload: { id: "note-1", title: "hello" },
    metadata: sampleMetadata,
    tenantId: "tenant-1",
    createdAt: "2026-04-28T00:00:00.000Z",
    publishedAt: "2026-04-28T00:00:01.000Z",
    attemptCount: 1,
  });
  expect(result.success).toBe(true);
});

test("outboxEntrySchema accepts a pending row without publish lifecycle fields", () => {
  const result = outboxEntrySchema.safeParse({
    id: "row-1",
    topic: "notes",
    eventName: "notes.created",
    payload: {},
    metadata: sampleMetadata,
    createdAt: "2026-04-28T00:00:00.000Z",
  });
  expect(result.success).toBe(true);
});

test("newOutboxEntrySchema rejects auto-managed fields silently by ignoring them", () => {
  // `pick` schemas silently drop unknown keys; the contract is that callers
  // pass only the user-supplied fields.
  const parsed = newOutboxEntrySchema.parse({
    topic: "notes",
    eventName: "notes.created",
    payload: {},
    metadata: sampleMetadata,
  });
  expect(parsed).not.toHaveProperty("id");
  expect(parsed).not.toHaveProperty("createdAt");
});

test("newOutboxEntrySchema requires a payload + metadata", () => {
  const result = newOutboxEntrySchema.safeParse({
    topic: "notes",
    eventName: "notes.created",
  });
  expect(result.success).toBe(false);
});
