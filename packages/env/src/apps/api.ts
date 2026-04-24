import { z } from "zod";
import { appEnvironmentSchema, nodeEnvironmentSchema, projectEnvSchema } from "../common.js";
import { requireInProduction } from "../production.js";
import { assertNoForeignKeys, pickEnv, type EnvSource, type StrictEnvOptions } from "../source.js";

const apiEnvKeys = [
  "APP_ENV",
  "AUTH_AUDIENCE",
  "AUTH_ISSUER_URL",
  "AUTH_MODE",
  "AUTH_SERVICE_URL",
  "AUTH_TOPOLOGY",
  "NODE_ENV",
  "PORT",
  "PROJECT_NAME",
  "PROJECT_SLUG",
  "PROJECT_TIMEZONE",
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
] as const;

export const apiEnvSchema = projectEnvSchema
  .extend({
    APP_ENV: appEnvironmentSchema.default("local"),
    AUTH_AUDIENCE: z.string().min(1).default("repo-api"),
    AUTH_ISSUER_URL: z.string().url().optional(),
    AUTH_MODE: z
      .enum(["better-auth-embedded", "external-oidc", "sso-gateway", "central-auth-service"])
      .default("better-auth-embedded"),
    AUTH_SERVICE_URL: z.string().url().optional(),
    AUTH_TOPOLOGY: z.enum(["single-app", "modular-monolith", "msa"]).default("modular-monolith"),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    DATABASE_URL: z.string().url().optional(),
    NODE_ENV: nodeEnvironmentSchema.default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.APP_ENV, value, ["DATABASE_URL"]);

    if (value.AUTH_MODE === "better-auth-embedded") {
      requireInProduction(ctx, value.APP_ENV, value, ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]);
      return;
    }

    requireInProduction(ctx, value.APP_ENV, value, ["AUTH_ISSUER_URL"]);

    if (value.AUTH_MODE === "sso-gateway" || value.AUTH_MODE === "central-auth-service") {
      requireInProduction(ctx, value.APP_ENV, value, ["AUTH_SERVICE_URL"]);
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(source: EnvSource = process.env, options?: StrictEnvOptions): ApiEnv {
  assertNoForeignKeys("api", source, [], ["EXPO_PUBLIC_", "NEXT_PUBLIC_", "VITE_"], options);
  return apiEnvSchema.parse(pickEnv(source, apiEnvKeys));
}
