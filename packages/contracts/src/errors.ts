import { z } from "zod";

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL",
  "UNAVAILABLE",
]);

export const publicErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  requestId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type PublicError = z.infer<typeof publicErrorSchema>;
