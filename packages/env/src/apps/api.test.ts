import { expect, test } from "vitest";
import { loadApiEnv } from "./api.js";

test("loadApiEnv hydrates safe local defaults from an empty source", () => {
  const env = loadApiEnv({});
  expect(env.APP_ENV).toBe("local");
  expect(env.AUTH_MODE).toBe("better-auth-embedded");
  expect(env.AUTH_TOPOLOGY).toBe("modular-monolith");
  expect(env.PORT).toBe(4000);
});

test("loadApiEnv rejects foreign public prefixes from another app surface", () => {
  expect(() => loadApiEnv({ NEXT_PUBLIC_APP_NAME: "leak" })).toThrow();
});

test("loadApiEnv ignores framework-internal keys (vite/vitest injects VITE_USER_NODE_ENV)", () => {
  // vitest injects VITE_USER_NODE_ENV into process.env when any .env file is
  // loaded. It's not a user-set value and must not trip the foreign-key guard.
  expect(() => loadApiEnv({ VITE_USER_NODE_ENV: "test" })).not.toThrow();
});
