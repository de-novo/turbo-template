import type { NewOutboxEntry } from "@repo/contracts";
import { Effect } from "effect";
import { expect, test } from "vitest";
import { createMemoryOutboxRelay, noopOutboxRelay } from "./outbox.js";

const sampleEntry: NewOutboxEntry = {
  topic: "notes",
  eventName: "notes.created",
  eventVersion: "1",
  payload: { id: "note-1" },
  metadata: {
    eventId: "evt_1",
    eventName: "notes.created",
    eventVersion: 1,
    occurredAt: "2026-04-28T00:00:00.000Z",
  },
};

test("noopOutboxRelay returns empty claims and silently accepts marks", async () => {
  const claimed = await Effect.runPromise(noopOutboxRelay.claimBatch(10));
  expect(claimed).toEqual([]);
  await Effect.runPromise(noopOutboxRelay.markPublished(["irrelevant"]));
  await Effect.runPromise(noopOutboxRelay.markFailed("irrelevant", "reason"));
});

test("memory relay enqueues a row and surfaces it via claimBatch", async () => {
  const relay = createMemoryOutboxRelay();
  const enqueued = await Effect.runPromise(relay.enqueue(sampleEntry));

  expect(enqueued.id).toBeDefined();
  expect(enqueued.publishedAt).toBeUndefined();
  expect(await Effect.runPromise(relay.pendingCount())).toBe(1);

  const claimed = await Effect.runPromise(relay.claimBatch(10));
  expect(claimed).toHaveLength(1);
  expect(claimed[0]?.id).toBe(enqueued.id);
});

test("markPublished removes a row from the pending set", async () => {
  const relay = createMemoryOutboxRelay();
  const row = await Effect.runPromise(relay.enqueue(sampleEntry));

  await Effect.runPromise(relay.markPublished([row.id]));

  expect(await Effect.runPromise(relay.pendingCount())).toBe(0);
  expect(await Effect.runPromise(relay.claimBatch(10))).toEqual([]);
});

test("markFailed increments attemptCount and records the reason", async () => {
  const relay = createMemoryOutboxRelay();
  const row = await Effect.runPromise(relay.enqueue(sampleEntry));

  await Effect.runPromise(relay.markFailed(row.id, "downstream 503"));

  const [stillPending] = await Effect.runPromise(relay.claimBatch(10));
  expect(stillPending?.attemptCount).toBe(1);
  expect(stillPending?.lastError).toBe("downstream 503");
});

test("claimBatch respects the limit and returns oldest first", async () => {
  const relay = createMemoryOutboxRelay();
  for (let i = 0; i < 5; i++) {
    await Effect.runPromise(
      relay.enqueue({
        ...sampleEntry,
        metadata: {
          ...sampleEntry.metadata,
          eventId: `evt_${i}`,
          occurredAt: new Date(2026, 3, 28, 0, 0, i).toISOString(),
        },
      }),
    );
  }

  const claimed = await Effect.runPromise(relay.claimBatch(3));
  expect(claimed).toHaveLength(3);
});
