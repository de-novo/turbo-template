import { expect, test } from "vitest";
import { err, ok } from "./result.js";

test("ok wraps a success value", () => {
  const result = ok(42);
  expect(result.ok).toBe(true);
  expect(result.ok && result.value).toBe(42);
});

test("err wraps a failure value", () => {
  const result = err("nope");
  expect(result.ok).toBe(false);
  expect(!result.ok && result.error).toBe("nope");
});
