import { Effect } from "effect";
import { expect, test } from "vitest";
import { createMemoryObjectStorage, noopObjectStorage } from "./storage.js";

const sampleBody = new TextEncoder().encode("hello world");

test("noopObjectStorage rejects reads with NOT_FOUND", async () => {
  const exit = await Effect.runPromiseExit(noopObjectStorage.get("uploads/file.png"));
  expect(exit._tag).toBe("Failure");
});

test("noopObjectStorage rejects put with UNAVAILABLE", async () => {
  const exit = await Effect.runPromiseExit(
    noopObjectStorage.put("uploads/file.png", sampleBody, { contentType: "text/plain" }),
  );
  expect(exit._tag).toBe("Failure");
});

test("memory storage round-trips put → head → get → delete", async () => {
  const storage = createMemoryObjectStorage();

  const stored = await Effect.runPromise(
    storage.put("uploads/hello.txt", sampleBody, {
      contentType: "text/plain",
      tenantId: "tenant-1",
    }),
  );
  expect(stored.sizeBytes).toBe(sampleBody.byteLength);
  expect(stored.tenantId).toBe("tenant-1");
  expect(stored.etag).toBe("mem-1");

  const head = await Effect.runPromise(storage.head("uploads/hello.txt"));
  expect(head.key).toBe("uploads/hello.txt");

  const fetched = await Effect.runPromise(storage.get("uploads/hello.txt"));
  expect(new TextDecoder().decode(fetched.body)).toBe("hello world");

  await Effect.runPromise(storage.delete("uploads/hello.txt"));
  const exitAfter = await Effect.runPromiseExit(storage.head("uploads/hello.txt"));
  expect(exitAfter._tag).toBe("Failure");
});

test("memory storage get/head reject missing keys with NOT_FOUND", async () => {
  const storage = createMemoryObjectStorage();
  const getExit = await Effect.runPromiseExit(storage.get("uploads/missing.png"));
  const headExit = await Effect.runPromiseExit(storage.head("uploads/missing.png"));
  expect(getExit._tag).toBe("Failure");
  expect(headExit._tag).toBe("Failure");
});

test("memory storage delete is idempotent on missing keys", async () => {
  const storage = createMemoryObjectStorage();
  await Effect.runPromise(storage.delete("uploads/never-existed"));
  // No throw — delete on a missing key is a no-op.
});

test("memory storage signUrl returns mem:// URL with expiresAt", async () => {
  const storage = createMemoryObjectStorage();
  const signed = await Effect.runPromise(
    storage.signUrl({
      key: "uploads/hello.txt",
      operation: "get",
      expiresInSeconds: 300,
    }),
  );
  expect(signed.url.startsWith("mem://get/uploads/hello.txt")).toBe(true);
  expect(new Date(signed.expiresAt).getTime()).toBeGreaterThan(Date.now());
});
