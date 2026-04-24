import { Effect } from "effect";
import type { AppError } from "@repo/platform";

export type HealthStatus = "ok" | "degraded" | "down";

export type HealthCheck = {
  name: string;
  check(): Effect.Effect<HealthStatus, AppError>;
};

export const healthy = (name: string): HealthCheck => ({
  name,
  check: () => Effect.succeed("ok"),
});
