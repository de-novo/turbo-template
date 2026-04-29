import { z } from "zod";
import { appEnvironmentSchema } from "../common.js";
import { requireInProduction } from "../production.js";
import { assertNoForeignKeys, pickEnv, type EnvSource, type StrictEnvOptions } from "../source.js";

const mobileEnvKeys = [
  "EXPO_PUBLIC_API_URL",
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_MOBILE_URL",
] as const;

export const mobileEnvSchema = z
  .object({
    EXPO_PUBLIC_API_URL: z.url().default("https://api.fullstack-typescript-template.localhost"),
    EXPO_PUBLIC_APP_ENV: appEnvironmentSchema.default("local"),
    EXPO_PUBLIC_MOBILE_URL: z.url().default("http://localhost:8081"),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.EXPO_PUBLIC_APP_ENV, value, [
      "EXPO_PUBLIC_API_URL",
      "EXPO_PUBLIC_MOBILE_URL",
    ]);
  });

export type MobileEnv = z.infer<typeof mobileEnvSchema>;

export function loadMobileEnv(
  source: EnvSource = process.env,
  options?: StrictEnvOptions,
): MobileEnv {
  assertNoForeignKeys(
    "mobile",
    source,
    ["BETTER_AUTH_SECRET", "DATABASE_URL"],
    ["NEXT_PUBLIC_", "VITE_"],
    options,
  );
  return mobileEnvSchema.parse(pickEnv(source, mobileEnvKeys));
}
