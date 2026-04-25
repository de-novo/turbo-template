import {
	Controller,
	Get,
	HttpException,
	HttpStatus,
	Inject,
} from "@nestjs/common";
import type { ApiSuccess } from "@repo/contracts";
import type { DatabaseClient } from "@repo/db";
import type { ApiEnv } from "@repo/env/apps/api";
import { API_ENV, DATABASE_CLIENT } from "../db/db.tokens.js";

type LivenessBody = { status: "ok"; service: string };

type ReadinessBody = {
	status: "ok";
	service: string;
	checks: { database: "ok" | "not-configured" };
};

/**
 * Two-probe health surface for orchestrators (Kubernetes, Argo CD, etc.).
 *
 * - GET /health/live  — liveness. The process is up; restart if this fails.
 * - GET /health/ready — readiness. Dependencies are reachable; route
 *   traffic if this passes. Currently checks the database connection
 *   when DATABASE_URL is configured; otherwise reports
 *   "not-configured" and treats the service as ready (template default
 *   so the API can boot without a live DB).
 *
 * Plain GET /health is preserved as an alias for /health/ready so
 * existing probe configs continue to work.
 */
@Controller("/health")
export class HealthController {
	constructor(
		@Inject(API_ENV) private readonly env: ApiEnv,
		@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
	) {}

	@Get()
	root(): Promise<ApiSuccess<ReadinessBody>> {
		return this.readiness();
	}

	@Get("/live")
	liveness(): ApiSuccess<LivenessBody> {
		return {
			ok: true,
			data: { status: "ok", service: this.env.PROJECT_SLUG },
		};
	}

	@Get("/ready")
	async readiness(): Promise<ApiSuccess<ReadinessBody>> {
		const dbStatus = await this.checkDatabase();
		// Failure of any required check translates to HTTP 503 so
		// orchestrators (Kubernetes readiness probe, ALB target group)
		// can route traffic correctly. The HTTP code is what probes act
		// on; the JSON body is for human/log inspection.
		if (dbStatus === "down") {
			throw new HttpException(
				{
					ok: false,
					error: {
						code: "READINESS_FAILED",
						message: "database is unreachable",
						details: { database: "down" },
					},
				},
				HttpStatus.SERVICE_UNAVAILABLE,
			);
		}

		return {
			ok: true,
			data: {
				status: "ok",
				service: this.env.PROJECT_SLUG,
				checks: { database: dbStatus },
			},
		};
	}

	private async checkDatabase(): Promise<"ok" | "down" | "not-configured"> {
		if (!this.env.DATABASE_URL) return "not-configured";
		try {
			await this.db.pool.query("SELECT 1");
			return "ok";
		} catch {
			return "down";
		}
	}
}
