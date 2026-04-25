import { loadDesktopEnv } from "@repo/env/apps/desktop";
import { expect, test } from "vitest";

test("desktop env loader hydrates safe local defaults from an empty source", () => {
  const env = loadDesktopEnv({});
  expect(env.VITE_APP_ENV).toBe("local");
  expect(env.VITE_API_URL).toBe("http://localhost:4000");
});
