import { z } from "zod";
import { appEnvironmentSchema } from "../common.js";
import { requireInProduction } from "../production.js";
import { assertNoForeignKeys, pickEnv, type EnvSource, type StrictEnvOptions } from "../source.js";

const webEnvKeys = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_APP_ENV", "NEXT_PUBLIC_WEB_URL"] as const;

export const webEnvSchema = z
  .object({
    NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
    NEXT_PUBLIC_APP_ENV: appEnvironmentSchema.default("local"),
    NEXT_PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000"),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.NEXT_PUBLIC_APP_ENV, value, [
      "NEXT_PUBLIC_API_URL",
      "NEXT_PUBLIC_WEB_URL",
    ]);
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
