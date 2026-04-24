import { z } from "zod";

export const authTopologySchema = z.enum(["single-app", "modular-monolith", "msa"]);

export const authStrategySchema = z.enum([
  "better-auth-embedded",
  "external-oidc",
  "sso-gateway",
  "central-auth-service",
]);

export const authStrategyConfigSchema = z.object({
  audience: z.string().min(1).optional(),
  issuerUrl: z.string().url().optional(),
  mode: authStrategySchema.default("better-auth-embedded"),
  serviceUrl: z.string().url().optional(),
  topology: authTopologySchema.default("modular-monolith"),
});

export type AuthTopology = z.infer<typeof authTopologySchema>;
export type AuthStrategy = z.infer<typeof authStrategySchema>;
export type AuthStrategyConfig = z.infer<typeof authStrategyConfigSchema>;

export const authStrategyDefaults = {
  audience: "repo-api",
  mode: "better-auth-embedded",
  topology: "modular-monolith",
} satisfies Pick<AuthStrategyConfig, "audience" | "mode" | "topology">;

export function isExternalAuthStrategy(mode: AuthStrategy): boolean {
  return mode === "external-oidc" || mode === "sso-gateway" || mode === "central-auth-service";
}

export function requiresServiceTokenAuth(mode: AuthStrategy): boolean {
  return mode === "sso-gateway" || mode === "central-auth-service";
}
