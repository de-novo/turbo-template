import { type ArgumentsHost, Catch, type ExceptionFilter } from "@nestjs/common";
import type { ApiResponse } from "@repo/contracts";
import { errorCodeToHttpStatus, getLoggerContext, toPublicError } from "@repo/platform";
import type { Response } from "express";
import { logger } from "../logger.js";

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
        stack: exception instanceof Error ? exception.stack : undefined,
      },
    });

    const body: ApiResponse<never> = { ok: false, error: publicError };
    res.status(status).json(body);
  }
}
