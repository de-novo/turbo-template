import { z } from "zod";

export const nodeEnvSchema = z.enum(["development", "test", "production"]);

export const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default("development"),
  PROJECT_NAME: z.string().min(1).default("Fullstack TypeScript Template"),
  PROJECT_SLUG: z.string().min(1).default("fullstack-typescript-template"),
  PROJECT_TIMEZONE: z.string().min(1).default("Asia/Seoul"),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
