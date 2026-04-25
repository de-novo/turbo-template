import { z } from "zod";
import { idSchema } from "./ids.js";
import { paginatedSchema, paginationParamsSchema } from "./pagination.js";

export const noteSchema = z.object({
	id: idSchema,
	ownerId: idSchema,
	title: z.string().min(1).max(200),
	content: z.string().max(50_000),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const createNoteInputSchema = z.object({
	title: z.string().min(1).max(200),
	content: z.string().max(50_000).default(""),
});

export const updateNoteInputSchema = z
	.object({
		title: z.string().min(1).max(200).optional(),
		content: z.string().max(50_000).optional(),
	})
	.refine((input) => input.title !== undefined || input.content !== undefined, {
		message: "At least one of `title` or `content` must be provided.",
	});

export const noteListQuerySchema = paginationParamsSchema;

export const noteListResponseSchema = paginatedSchema(noteSchema);

export type Note = z.infer<typeof noteSchema>;
export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;
export type NoteListQuery = z.infer<typeof noteListQuerySchema>;
export type NoteListResponse = z.infer<typeof noteListResponseSchema>;
