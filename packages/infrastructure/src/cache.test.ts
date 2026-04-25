import { Effect } from "effect";
import { expect, test } from "vitest";
import { createMemoryCache } from "./cache.js";

test("memory cache round-trips a value", async () => {
  const cache = createMemoryCache();
  await Effect.runPromise(cache.set("alpha", "one"));
  const value = await Effect.runPromise(cache.get("alpha"));
  expect(value).toBe("one");
});

test("memory cache returns undefined for an unknown key", async () => {
  const cache = createMemoryCache();
  const value = await Effect.runPromise(cache.get("missing"));
  expect(value).toBeUndefined();
});
