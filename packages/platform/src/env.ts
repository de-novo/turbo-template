import { baseEnvSchema, type BaseEnv } from "@repo/contracts";

export function parseBaseEnv(input: unknown = process.env): BaseEnv {
  return baseEnvSchema.parse(input);
}
