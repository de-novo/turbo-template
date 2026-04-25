import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	Logger,
} from "@nestjs/common";
import type { ApiFailure, ErrorCode } from "@repo/contracts";
import { AppError, toPublicError } from "@repo/platform";
import type { Request, Response } from "express";

const CODE_TO_HTTP_STATUS: Record<ErrorCode, number> = {
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL: 500,
	UNAVAILABLE: 503,
};

@Catch(AppError)
export class AppErrorFilter implements ExceptionFilter {
	private readonly logger = new Logger(AppErrorFilter.name);

	catch(error: AppError, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const req = ctx.getRequest<Request & { id?: string }>();
		const res = ctx.getResponse<Response>();

		const requestId = typeof req.id === "string" ? req.id : undefined;
		const status = CODE_TO_HTTP_STATUS[error.code];
		const payload = toPublicError(error, requestId);

		this.logger.warn({
			msg: `AppError ${error.code}: ${error.message}`,
			code: error.code,
			status,
			requestId,
			details: error.details,
			path: req.url,
		});

		const body: ApiFailure = { ok: false, error: payload };
		res.status(status).json(body);
	}
}
