import { loadMfeHostEnv } from "@repo/env/apps/mfe-host";
import { expect, test } from "vitest";

test("mfe-host env loader hydrates safe local defaults from an empty source", () => {
  const env = loadMfeHostEnv({});
  expect(env.VITE_MFE_HOST_ENV).toBe("local");
  expect(env.VITE_MFE_HOST_URL).toBe("http://localhost:3100");
});
