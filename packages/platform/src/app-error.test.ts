import type { ErrorCode } from "@repo/contracts";
import { expect, test } from "vitest";
import {
  AppError,
  errorCodeToHttpStatus,
  httpStatusToErrorCode,
  toPublicError,
} from "./app-error.js";

test("errorCodeToHttpStatus covers every documented error code", () => {
  const codes: ErrorCode[] = [
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "RATE_LIMITED",
    "INTERNAL",
    "UNAVAILABLE",
  ];
  for (const code of codes) {
    expect(errorCodeToHttpStatus[code]).toBeGreaterThanOrEqual(400);
  }
});

test("httpStatusToErrorCode round-trips known mappings", () => {
  expect(httpStatusToErrorCode(404)).toBe("NOT_FOUND");
  expect(httpStatusToErrorCode(429)).toBe("RATE_LIMITED");
  expect(httpStatusToErrorCode(418)).toBe("INTERNAL");
});

test("toPublicError preserves AppError details and attaches a request id", () => {
  const error = new AppError({
    code: "BAD_REQUEST",
    message: "missing field",
    details: { field: "email" },
  });
  const publicError = toPublicError(error, "req_42");
  expect(publicError.code).toBe("BAD_REQUEST");
  expect(publicError.requestId).toBe("req_42");
  expect(publicError.details).toEqual({ field: "email" });
});
