import { Effect } from "effect";
import { AppError } from "./app-error.js";

export type Workflow<TValue, TError = AppError> = Effect.Effect<TValue, TError>;

export async function runWorkflow<TValue, TError>(
  workflow: Effect.Effect<TValue, TError>,
): Promise<TValue> {
  return Effect.runPromise(workflow);
}

export const workflowTimeout = (milliseconds: number) =>
  Effect.timeoutFail({
    duration: `${milliseconds} millis`,
    onTimeout: () =>
      new AppError({
        code: "UNAVAILABLE",
        message: "Workflow timed out.",
      }),
  });
