import { z } from "zod";
import { publicErrorSchema } from "./errors.js";

export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
	z.object({
		ok: z.literal(true),
		data,
	});

export const apiFailureSchema = z.object({
	ok: z.literal(false),
	error: publicErrorSchema,
});

export const apiResponseSchema = <T extends z.ZodType>(data: T) =>
	z.discriminatedUnion("ok", [apiSuccessSchema(data), apiFailureSchema]);

export type ApiSuccess<T> = {
	ok: true;
	data: T;
};

export type ApiFailure = z.infer<typeof apiFailureSchema>;

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
