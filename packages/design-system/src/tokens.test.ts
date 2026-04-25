import { expect, test } from "vitest";
import { designTokens } from "./tokens.js";

test("designTokens exposes the documented semantic colors", () => {
  expect(designTokens.colors.canvas).toBe("#F8FAFC");
  expect(designTokens.colors.textPrimary).toBe("#111827");
});
