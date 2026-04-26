import { z } from "zod";
import { idSchema } from "./ids.js";
import { paginationParamsSchema } from "./pagination.js";

/**
 * Reference domain contract used by `apps/api/src/notes/`. Demonstrates the
 * canonical shape: ids + timestamps from shared building blocks, distinct
 * input vs output schemas, and explicit pagination on list queries.
 *
 * Real product modules should mirror this layout: shared schema in
 * `@repo/contracts/<domain>`, NestJS controller validates inputs against the
 * `*Body` / `*Query` schemas via `ZodValidationPipe`, and returns the `Note`
 * shape on the success envelope.
 */

export const noteSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(120),
  body: z.string().max(10_000).default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createNoteBodySchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(10_000).default(""),
});

export const updateNoteBodySchema = z.object({
  title: z.string().min(1).max(120).optional(),
  body: z.string().max(10_000).optional(),
});

export const listNotesQuerySchema = paginationParamsSchema;

export type Note = z.infer<typeof noteSchema>;
export type CreateNoteBody = z.infer<typeof createNoteBodySchema>;
export type UpdateNoteBody = z.infer<typeof updateNoteBodySchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
