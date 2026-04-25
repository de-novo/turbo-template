import { expect, test } from "vitest";
import {
  authStrategyDefaults,
  authStrategySchema,
  isExternalAuthStrategy,
  requiresServiceTokenAuth,
} from "./strategy.js";

test("authStrategySchema accepts every documented strategy", () => {
  for (const mode of [
    "better-auth-embedded",
    "external-oidc",
    "sso-gateway",
    "central-auth-service",
  ] as const) {
    expect(authStrategySchema.parse(mode)).toBe(mode);
  }
});

test("default strategy is the embedded better-auth path", () => {
  expect(authStrategyDefaults.mode).toBe("better-auth-embedded");
  expect(isExternalAuthStrategy("better-auth-embedded")).toBe(false);
  expect(requiresServiceTokenAuth("sso-gateway")).toBe(true);
});
