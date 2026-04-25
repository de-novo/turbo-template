import { z } from "zod";

export const idSchema = z.string().min(1);
export const requestIdSchema = z.string().min(1);
export const slugSchema = z
	.string()
	.min(1)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export type Id = z.infer<typeof idSchema>;
export type RequestId = z.infer<typeof requestIdSchema>;
export type Slug = z.infer<typeof slugSchema>;
