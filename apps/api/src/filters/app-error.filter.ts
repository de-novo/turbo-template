import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import type { ApiResponse } from "@repo/contracts";
import { loadApiEnv } from "@repo/env/apps/api";
import { errorCodeToHttpStatus, getLoggerContext, toPublicError } from "@repo/platform";
import type { Response } from "express";
import { logger } from "../logger.js";

// Resolved once at module load — APP_ENV doesn't change at runtime, and reading
// it on every error path is needless overhead in the hot 500-response loop.
const includeStackInLogs = loadApiEnv().APP_ENV !== "production";

@Catch()
export class AppErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const requestId = getLoggerContext()?.requestId;

    const publicError = toPublicError(exception, requestId);
    const status = errorCodeToHttpStatus[publicError.code];

    logger.log({
      level: status >= 500 ? "error" : "warn",
      message: publicError.message,
      details: {
        code: publicError.code,
        // Stack traces leak internal paths and dependency layout. Keep them in
        // dev (debugging signal) but strip in production (log-shipper noise +
        // surface-area exposure).
        ...(includeStackInLogs && exception instanceof Error ? { stack: exception.stack } : {}),
      },
    });

    const body: ApiResponse<never> = { ok: false, error: publicError };
    res.status(status).json(body);
  }
}
