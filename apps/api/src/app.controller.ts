import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import type { UserIdentity } from "@repo/auth";
import type { ApiResponse } from "@repo/contracts";
import { databaseNotConfigured } from "@repo/db";
import type { ApiEnv } from "@repo/env/apps/api";
import {
	createMemoryCache,
	type HealthStatus,
	healthy,
} from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { AuthGuard } from "./auth/auth.guard.js";
import { CurrentUser } from "./auth/current-user.decorator.js";
import { API_ENV } from "./db/db.tokens.js";

type HealthResponse = {
	service: string;
	status: HealthStatus;
	database: typeof databaseNotConfigured;
};

@Controller()
export class AppController {
	private readonly cache = createMemoryCache();
	private readonly health = healthy("api");

	constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

	@Get("/health")
	async healthCheck(): Promise<ApiResponse<HealthResponse>> {
		await runWorkflow(
			this.cache.set("health:last-check", new Date().toISOString()),
		);

		return {
			ok: true,
			data: {
				database: databaseNotConfigured,
				service: this.env.PROJECT_SLUG,
				status: await runWorkflow(this.health.check()),
			},
		};
	}

	@Get("/me")
	@UseGuards(AuthGuard)
	me(@CurrentUser() user: UserIdentity): ApiResponse<UserIdentity> {
		return { ok: true, data: user };
	}
}
