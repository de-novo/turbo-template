import { describe, expect, it } from "vitest";
import { AppError, toPublicError } from "./app-error.js";

describe("AppError", () => {
	it("stores code, message, and details", () => {
		const err = new AppError({
			code: "NOT_FOUND",
			message: "resource missing",
			details: { id: "abc" },
		});
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe("NOT_FOUND");
		expect(err.message).toBe("resource missing");
		expect(err.details).toEqual({ id: "abc" });
	});

	it("preserves cause when provided", () => {
		const cause = new Error("boom");
		const err = new AppError({
			code: "INTERNAL",
			message: "wrapped",
			cause,
		});
		expect(err.cause).toBe(cause);
	});
});

describe("toPublicError", () => {
	it("maps an AppError to its public shape", () => {
		const err = new AppError({
			code: "BAD_REQUEST",
			message: "invalid input",
			details: { field: "email" },
		});
		expect(toPublicError(err, "req-123")).toEqual({
			code: "BAD_REQUEST",
			message: "invalid input",
			requestId: "req-123",
			details: { field: "email" },
		});
	});

	it("omits requestId and details when absent", () => {
		const err = new AppError({ code: "FORBIDDEN", message: "nope" });
		expect(toPublicError(err)).toEqual({
			code: "FORBIDDEN",
			message: "nope",
		});
	});

	it("defaults unknown errors to INTERNAL", () => {
		expect(toPublicError(new Error("raw"))).toEqual({
			code: "INTERNAL",
			message: "Unexpected internal error.",
		});
		expect(toPublicError("string error")).toEqual({
			code: "INTERNAL",
			message: "Unexpected internal error.",
		});
	});

	it("attaches requestId to fallback error", () => {
		expect(toPublicError(new Error("raw"), "req-999")).toEqual({
			code: "INTERNAL",
			message: "Unexpected internal error.",
			requestId: "req-999",
		});
	});
});
