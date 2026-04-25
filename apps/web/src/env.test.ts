import { loadWebEnv } from "@repo/env/apps/web";
import { expect, test } from "vitest";

test("web env loader hydrates safe local defaults from an empty source", () => {
  const env = loadWebEnv({});
  expect(env.NEXT_PUBLIC_APP_ENV).toBe("local");
  expect(env.NEXT_PUBLIC_AUTH_MODE).toBe("better-auth-embedded");
});
