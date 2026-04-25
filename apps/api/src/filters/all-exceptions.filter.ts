import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	Logger,
} from "@nestjs/common";
import type { ApiFailure, ErrorCode, PublicError } from "@repo/contracts";
import type { Request, Response } from "express";

const HTTP_STATUS_TO_CODE: Record<number, ErrorCode> = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	409: "CONFLICT",
	429: "RATE_LIMITED",
	503: "UNAVAILABLE",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger = new Logger(AllExceptionsFilter.name);

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const req = ctx.getRequest<Request & { id?: string }>();
		const res = ctx.getResponse<Response>();
		const requestId = typeof req.id === "string" ? req.id : undefined;

		let status = 500;
		let error: PublicError = {
			code: "INTERNAL",
			message: "Unexpected internal error.",
		};

		if (exception instanceof HttpException) {
			status = exception.getStatus();
			const code: ErrorCode = HTTP_STATUS_TO_CODE[status] ?? "INTERNAL";
			const response = exception.getResponse();
			const message =
				typeof response === "string"
					? response
					: typeof response === "object" &&
							response !== null &&
							"message" in response
						? String((response as { message: unknown }).message)
						: exception.message;
			error = { code, message };
		} else if (exception instanceof Error) {
			this.logger.error({
				msg: `Unhandled exception: ${exception.message}`,
				name: exception.name,
				stack: exception.stack,
				requestId,
				path: req.url,
			});
		} else {
			this.logger.error({
				msg: "Unhandled non-Error exception",
				exception,
				requestId,
				path: req.url,
			});
		}

		if (requestId) error.requestId = requestId;

		const body: ApiFailure = { ok: false, error };
		res.status(status).json(body);
	}
}
