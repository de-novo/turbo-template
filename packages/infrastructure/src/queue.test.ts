import type { JobDescriptor } from "@repo/contracts";
import { AppError } from "@repo/platform";
import { Effect } from "effect";
import { expect, test } from "vitest";
import { createMemoryJobQueue, noopJobQueue } from "./queue.js";

const sample: JobDescriptor = {
  name: "notes.image.resize",
  payload: { id: "img-1" },
  maxAttempts: 3,
};

test("noopJobQueue accepts enqueue and never produces work", async () => {
  const enqueued = await Effect.runPromise(noopJobQueue.enqueue(sample));
  expect(enqueued.status).toBe("pending");
  expect(await Effect.runPromise(noopJobQueue.claimNext())).toBeNull();
});

test("memory queue round-trips enqueue → claim → ack", async () => {
  const queue = createMemoryJobQueue();
  await Effect.runPromise(queue.enqueue(sample));

  const claimed = await Effect.runPromise(queue.claimNext());
  if (!claimed) throw new Error("expected claim");
  expect(claimed.status).toBe("running");
  expect(claimed.attempt).toBe(1);

  await Effect.runPromise(queue.ack(claimed.id));
  const sizes = await Effect.runPromise(queue.sizeByStatus());
  expect(sizes.succeeded).toBe(1);
  expect(sizes.pending).toBe(0);
});

test("memory queue dedupes by idempotencyKey", async () => {
  const queue = createMemoryJobQueue();
  const first = await Effect.runPromise(queue.enqueue({ ...sample, idempotencyKey: "k-1" }));
  const second = await Effect.runPromise(queue.enqueue({ ...sample, idempotencyKey: "k-1" }));
  expect(second.id).toBe(first.id);

  const sizes = await Effect.runPromise(queue.sizeByStatus());
  expect(sizes.pending).toBe(1);
});

test("nack returns the job to pending until maxAttempts is exhausted", async () => {
  const queue = createMemoryJobQueue();
  await Effect.runPromise(queue.enqueue({ ...sample, maxAttempts: 2 }));

  const first = await Effect.runPromise(queue.claimNext());
  if (!first) throw new Error("expected claim");
  await Effect.runPromise(queue.nack(first.id, "transient"));

  const second = await Effect.runPromise(queue.claimNext());
  if (!second) throw new Error("expected re-claim after nack");
  expect(second.attempt).toBe(2);
  expect(second.lastError).toBe("transient");

  await Effect.runPromise(queue.nack(second.id, "still failing"));
  const sizes = await Effect.runPromise(queue.sizeByStatus());
  expect(sizes.failed).toBe(1);
  expect(sizes.pending).toBe(0);
});

test("scheduledFor defers a job until the clock catches up", async () => {
  const queue = createMemoryJobQueue();
  const future = "2099-01-01T00:00:00.000Z";
  await Effect.runPromise(queue.enqueue({ ...sample, scheduledFor: future }));

  expect(await Effect.runPromise(queue.claimNext(new Date("2026-04-28T00:00:00.000Z")))).toBeNull();

  const claimed = await Effect.runPromise(queue.claimNext(new Date("2099-06-01T00:00:00.000Z")));
  expect(claimed?.status).toBe("running");
});

test("claimNext returns oldest first (FIFO by enqueuedAt)", async () => {
  const queue = createMemoryJobQueue();
  const a = await Effect.runPromise(queue.enqueue({ ...sample, name: "first" }));
  await Effect.runPromise(queue.enqueue({ ...sample, name: "second" }));

  const claimed = await Effect.runPromise(queue.claimNext());
  expect(claimed?.id).toBe(a.id);
});

test("ack on a missing job fails through the typed error channel", async () => {
  const queue = createMemoryJobQueue();
  const error = await Effect.runPromise(Effect.flip(queue.ack("missing")));
  expect(error).toBeInstanceOf(AppError);
  expect(error.code).toBe("NOT_FOUND");
});

test("nack on a missing job fails through the typed error channel", async () => {
  const queue = createMemoryJobQueue();
  const error = await Effect.runPromise(Effect.flip(queue.nack("missing", "boom")));
  expect(error).toBeInstanceOf(AppError);
  expect(error.code).toBe("NOT_FOUND");
});
