import { Effect } from "effect";
import { expect, test } from "vitest";
import { AppError } from "./app-error.js";
import { runWorkflow } from "./workflow.js";

test("runWorkflow returns the success value", async () => {
  await expect(runWorkflow(Effect.succeed(42))).resolves.toBe(42);
});

test("runWorkflow surfaces the original AppError instead of wrapping in FiberFailure", async () => {
  const error = new AppError({ code: "NOT_FOUND", message: "missing" });
  await expect(runWorkflow(Effect.fail(error))).rejects.toBe(error);
});
