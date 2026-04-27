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
  "LOG_LEVEL",
  "NODE_ENV",
  "OTEL_EXPORTER_OTLP_ENDPOINT",
  "OTEL_SERVICE_VERSION",
  "PORT",
  "PROJECT_NAME",
  "PROJECT_SLUG",
  "PROJECT_TIMEZONE",
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "JOBS_ENABLED",
  "CORS_ORIGINS",
] as const;

export const apiEnvSchema = projectEnvSchema
  .extend({
    APP_ENV: appEnvironmentSchema.default("local"),
    AUTH_AUDIENCE: z.string().min(1).default("repo-api"),
    AUTH_ISSUER_URL: z.url().optional(),
    AUTH_MODE: z
      .enum(["better-auth-embedded", "external-oidc", "sso-gateway", "central-auth-service"])
      .default("better-auth-embedded"),
    AUTH_SERVICE_URL: z.url().optional(),
    AUTH_TOPOLOGY: z.enum(["single-app", "modular-monolith", "msa"]).default("modular-monolith"),
    BETTER_AUTH_SECRET: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.url().optional(),
    CORS_ORIGINS: z
      .string()
      .optional()
      .transform((v) =>
        v
          ? v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      ),
    DATABASE_URL: z.url().optional(),
    JOBS_ENABLED: z
      .union([z.boolean(), z.enum(["true", "false"])])
      .transform((v) => v === true || v === "true")
      .default(false),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    NODE_ENV: nodeEnvironmentSchema.default("development"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
    OTEL_SERVICE_VERSION: z.string().min(1).optional(),
    PORT: z.coerce.number().int().positive().default(4000),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.APP_ENV, value, ["DATABASE_URL", "CORS_ORIGINS"]);

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
