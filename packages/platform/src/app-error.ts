import type { ErrorCode, PublicError } from "@repo/contracts";

export type AppErrorOptions = {
  code: ErrorCode;
  message: string;
  cause?: unknown;
  details?: Record<string, unknown>;
};

export const errorCodeToHttpStatus: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
};

export function httpStatusToErrorCode(status: number): ErrorCode {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "UNAVAILABLE";
  return "INTERNAL";
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.details = options.details;
  }
}

export function toPublicError(error: unknown, requestId?: string): PublicError {
  if (error instanceof AppError) {
    const publicError: PublicError = {
      code: error.code,
      message: error.message,
    };

    if (requestId) {
      publicError.requestId = requestId;
    }

    if (error.details) {
      publicError.details = error.details;
    }

    return publicError;
  }

  const publicError: PublicError = {
    code: "INTERNAL",
    message: "Unexpected internal error.",
  };

  if (requestId) {
    publicError.requestId = requestId;
  }

  return publicError;
}
