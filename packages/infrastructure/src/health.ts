import type { AppError } from "@repo/platform";
import { Effect } from "effect";

export type HealthStatus = "ok" | "degraded" | "down";

export type HealthCheck = {
	name: string;
	check(): Effect.Effect<HealthStatus, AppError>;
};

export const healthy = (name: string): HealthCheck => ({
	name,
	check: () => Effect.succeed("ok"),
});
