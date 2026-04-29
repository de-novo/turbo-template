import { z } from "zod";
import { appEnvironmentSchema } from "../common.js";
import { requireInProduction } from "../production.js";
import { assertNoForeignKeys, pickEnv, type EnvSource, type StrictEnvOptions } from "../source.js";

const mfeHostEnvKeys = [
  "VITE_MFE_DASHBOARD_MANIFEST_URL",
  "VITE_MFE_HOST_ENV",
  "VITE_MFE_HOST_URL",
] as const;

export const mfeHostEnvSchema = z
  .object({
    VITE_MFE_DASHBOARD_MANIFEST_URL: z
      .string()
      .url()
      .default(
        "https://mfe-dashboard.fullstack-typescript-template.localhost/mfe-manifest.dev.json",
      ),
    VITE_MFE_HOST_ENV: appEnvironmentSchema.default("local"),
    VITE_MFE_HOST_URL: z.url().default("https://mfe.fullstack-typescript-template.localhost"),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.VITE_MFE_HOST_ENV, value, [
      "VITE_MFE_DASHBOARD_MANIFEST_URL",
      "VITE_MFE_HOST_URL",
    ]);
  });

export type MfeHostEnv = z.infer<typeof mfeHostEnvSchema>;

export function loadMfeHostEnv(source: EnvSource, options?: StrictEnvOptions): MfeHostEnv {
  assertNoForeignKeys(
    "mfe-host",
    source,
    ["BETTER_AUTH_SECRET", "DATABASE_URL"],
    ["EXPO_PUBLIC_", "NEXT_PUBLIC_"],
    options,
  );
  return mfeHostEnvSchema.parse(pickEnv(source, mfeHostEnvKeys));
}
