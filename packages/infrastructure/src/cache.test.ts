import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { createMemoryCache } from "./cache.js";
import { healthy } from "./health.js";

describe("createMemoryCache", () => {
	it("round-trips set/get", async () => {
		const cache = createMemoryCache();
		await Effect.runPromise(cache.set("a", "1"));
		const value = await Effect.runPromise(cache.get("a"));
		expect(value).toBe("1");
	});

	it("returns undefined for missing keys", async () => {
		const cache = createMemoryCache();
		const value = await Effect.runPromise(cache.get("missing"));
		expect(value).toBeUndefined();
	});

	it("deletes keys", async () => {
		const cache = createMemoryCache();
		await Effect.runPromise(cache.set("a", "1"));
		await Effect.runPromise(cache.delete("a"));
		const value = await Effect.runPromise(cache.get("a"));
		expect(value).toBeUndefined();
	});
});

describe("healthy", () => {
	it("reports ok", async () => {
		const status = await Effect.runPromise(healthy("redis").check());
		expect(status).toBe("ok");
	});
});
