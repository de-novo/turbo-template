import { Cause, Effect, Exit, Option } from "effect";
import { AppError } from "./app-error.js";

export type Workflow<TValue, TError = AppError> = Effect.Effect<TValue, TError>;

export async function runWorkflow<TValue, TError>(
  workflow: Effect.Effect<TValue, TError>,
): Promise<TValue> {
  const exit = await Effect.runPromiseExit(workflow);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }

  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) {
    throw failure.value;
  }

  const defect = Cause.dieOption(exit.cause);
  if (Option.isSome(defect)) {
    throw defect.value;
  }

  throw new AppError({
    code: "INTERNAL",
    message: "Workflow exited without a recoverable failure.",
    cause: exit.cause,
  });
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
