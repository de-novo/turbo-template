import { z } from "zod";

export const appEnvironmentSchema = z.enum(["local", "development", "staging", "production"]);
export const nodeEnvironmentSchema = z.enum(["development", "test", "production"]);

export const projectEnvSchema = z.object({
  PROJECT_NAME: z.string().min(1).default("Fullstack TypeScript Template"),
  PROJECT_SLUG: z.string().min(1).default("fullstack-typescript-template"),
  PROJECT_TIMEZONE: z.string().min(1).default("Asia/Seoul"),
});

export type AppEnvironment = z.infer<typeof appEnvironmentSchema>;
export type NodeEnvironment = z.infer<typeof nodeEnvironmentSchema>;
export type ProjectEnv = z.infer<typeof projectEnvSchema>;
