import type { NotificationMessage } from "@repo/contracts";
import { Effect } from "effect";
import { expect, test } from "vitest";
import { createMemoryNotifier, noopNotifier } from "./notification.js";

const sample: NotificationMessage = {
  recipient: { channel: "email", address: "user@example.com" },
  subject: "Welcome",
  body: "Hello!",
};

test("noopNotifier returns delivered:false without recording anything", async () => {
  const result = await Effect.runPromise(noopNotifier.send(sample));
  expect(result.delivered).toBe(false);
  expect(result.providerMessageId).toBeUndefined();
});

test("memory notifier records sent messages and assigns providerMessageId", async () => {
  const notifier = createMemoryNotifier();
  const first = await Effect.runPromise(notifier.send(sample));
  const second = await Effect.runPromise(
    notifier.send({ ...sample, recipient: { channel: "sms", phone: "+15551234" } }),
  );

  expect(first.delivered).toBe(true);
  expect(first.providerMessageId).toBe("mem_1");
  expect(second.providerMessageId).toBe("mem_2");
});

test("drain returns all recorded messages and clears the buffer", async () => {
  const notifier = createMemoryNotifier();
  await Effect.runPromise(notifier.send(sample));
  await Effect.runPromise(notifier.send(sample));

  const first = notifier.drain();
  expect(first).toHaveLength(2);

  const second = notifier.drain();
  expect(second).toEqual([]);
});

test("drain preserves the message shape (recipient, subject, body, tenant)", async () => {
  const notifier = createMemoryNotifier();
  await Effect.runPromise(notifier.send({ ...sample, tenantId: "tenant-1" }));

  const drained = notifier.drain();
  expect(drained[0]?.tenantId).toBe("tenant-1");
  expect(drained[0]?.recipient).toEqual({ channel: "email", address: "user@example.com" });
});
