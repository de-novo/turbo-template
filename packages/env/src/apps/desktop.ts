import { z } from "zod";
import { appEnvironmentSchema } from "../common.js";
import { requireInProduction } from "../production.js";
import { assertNoForeignKeys, pickEnv, type EnvSource, type StrictEnvOptions } from "../source.js";

const desktopEnvKeys = ["VITE_API_URL", "VITE_APP_ENV", "VITE_DESKTOP_URL"] as const;

export const desktopEnvSchema = z
  .object({
    VITE_API_URL: z.url().default("https://api.fullstack-typescript-template.localhost"),
    VITE_APP_ENV: appEnvironmentSchema.default("local"),
    VITE_DESKTOP_URL: z.url().default("https://desktop.fullstack-typescript-template.localhost"),
  })
  .superRefine((value, ctx) => {
    requireInProduction(ctx, value.VITE_APP_ENV, value, ["VITE_API_URL", "VITE_DESKTOP_URL"]);
  });

export type DesktopEnv = z.infer<typeof desktopEnvSchema>;

export function loadDesktopEnv(source: EnvSource, options?: StrictEnvOptions): DesktopEnv {
  assertNoForeignKeys(
    "desktop",
    source,
    ["BETTER_AUTH_SECRET", "DATABASE_URL"],
    ["EXPO_PUBLIC_", "NEXT_PUBLIC_"],
    options,
  );
  return desktopEnvSchema.parse(pickEnv(source, desktopEnvKeys));
}
