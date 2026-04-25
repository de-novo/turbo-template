import type { AppError } from "@repo/platform";
import { Effect } from "effect";

export type CacheStore = {
	get(key: string): Effect.Effect<string | undefined, AppError>;
	set(
		key: string,
		value: string,
		ttlSeconds?: number,
	): Effect.Effect<void, AppError>;
	delete(key: string): Effect.Effect<void, AppError>;
};

export function createMemoryCache(): CacheStore {
	const values = new Map<string, string>();

	return {
		get: (key) => Effect.succeed(values.get(key)),
		set: (key, value) =>
			Effect.sync(() => {
				values.set(key, value);
			}),
		delete: (key) =>
			Effect.sync(() => {
				values.delete(key);
			}),
	};
}
