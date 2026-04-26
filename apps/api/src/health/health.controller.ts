import { Controller, Get, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { ApiSuccess } from "@repo/contracts";
import { databaseNotConfigured, type DatabaseHealth } from "@repo/db";
import { healthy, type HealthStatus } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { API_ENV, type ApiEnv } from "../api-env.module.js";

type LivenessBody = { status: "ok"; service: string };

type ReadinessBody = {
  status: HealthStatus;
  service: string;
  database: DatabaseHealth;
};

@SkipThrottle()
@Controller("/health")
export class HealthController {
  private readonly health = healthy("api");

  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  @Get("/live")
  liveness(): ApiSuccess<LivenessBody> {
    return {
      ok: true,
      data: { status: "ok", service: this.env.PROJECT_SLUG },
    };
  }

  @Get("/ready")
  async readiness(): Promise<ApiSuccess<ReadinessBody>> {
    const status = await runWorkflow(this.health.check());
    return {
      ok: true,
      data: {
        status,
        service: this.env.PROJECT_SLUG,
        database: databaseNotConfigured,
      },
    };
  }
}
