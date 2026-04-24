import { z } from "zod";

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function parseDatabaseEnv(input: unknown = process.env): DatabaseEnv {
  return databaseEnvSchema.parse(input);
}
