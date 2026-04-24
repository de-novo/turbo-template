import { z } from "zod";
import { appEnvironmentSchema } from "../common.js";
import { requireInProduction } from "../production.js";
import { assertNoForeignKeys, pickEnv, type EnvSource, type StrictEnvOptions } from "../source.js";

const webEnvKeys = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_AUTH_ISSUER_URL",
  "NEXT_PUBLIC_AUTH_MODE",
  "NEXT_PUBLIC_AUTH_SERVICE_URL",
  "NEXT_PUBLIC_AUTH_TOPOLOGY",
  "NEXT_PUBLIC_WEB_URL",
] as const;

export const webEnvSchema = z
  .object({
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
    NEXT_PUBLIC_APP_ENV: appEnvironmentSchema.default("local"),
    NEXT_PUBLIC_AUTH_ISSUER_URL: z.string().url().optional(),
    NEXT_PUBLIC_AUTH_MODE: z
      .enum(["better-auth-embedded", "external-oidc", "sso-gateway", "central-auth-service"])
      .default("better-auth-embedded"),
    NEXT_PUBLIC_AUTH_SERVICE_URL: z.string().url().optional(),
    NEXT_PUBLIC_AUTH_TOPOLOGY: z
      .enum(["single-app", "modular-monolith", "msa"])
      .default("modular-monolith"),
    NEXT_PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000"),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.NEXT_PUBLIC_APP_ENV, value, [
      "NEXT_PUBLIC_API_URL",
      "NEXT_PUBLIC_WEB_URL",
    ]);

    if (value.NEXT_PUBLIC_AUTH_MODE === "better-auth-embedded") {
      return;
    }

    requireInProduction(ctx, value.NEXT_PUBLIC_APP_ENV, value, ["NEXT_PUBLIC_AUTH_ISSUER_URL"]);

    if (
      value.NEXT_PUBLIC_AUTH_MODE === "sso-gateway" ||
      value.NEXT_PUBLIC_AUTH_MODE === "central-auth-service"
    ) {
      requireInProduction(ctx, value.NEXT_PUBLIC_APP_ENV, value, ["NEXT_PUBLIC_AUTH_SERVICE_URL"]);
    }
  });

export type WebEnv = z.infer<typeof webEnvSchema>;

export function loadWebEnv(source: EnvSource = process.env, options?: StrictEnvOptions): WebEnv {
  assertNoForeignKeys(
    "web",
    source,
    ["BETTER_AUTH_SECRET", "DATABASE_URL"],
    ["EXPO_PUBLIC_", "VITE_"],
    options,
  );
  return webEnvSchema.parse(pickEnv(source, webEnvKeys));
}
