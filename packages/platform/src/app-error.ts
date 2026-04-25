import type { ErrorCode, PublicError } from "@repo/contracts";

export type AppErrorOptions = {
	code: ErrorCode;
	message: string;
	cause?: unknown;
	details?: Record<string, unknown>;
};

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
