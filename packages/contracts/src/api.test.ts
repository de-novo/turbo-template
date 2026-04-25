import { expect, test } from "vitest";
import { z } from "zod";
import { apiResponseSchema, apiSuccessSchema } from "./api.js";

test("apiSuccessSchema parses an ok envelope", () => {
  const parsed = apiSuccessSchema(z.string()).parse({ ok: true, data: "hello" });
  expect(parsed).toEqual({ ok: true, data: "hello" });
});

test("apiResponseSchema discriminates failure on ok=false", () => {
  const failure = apiResponseSchema(z.string()).parse({
    ok: false,
    error: { code: "INTERNAL", message: "boom" },
  });
  expect(failure.ok).toBe(false);
});
