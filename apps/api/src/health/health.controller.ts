import { Controller, Get, HttpCode, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { ApiSuccess } from "@repo/contracts";
import {
  checkDatabase,
  type DatabaseClient,
  type DatabaseHealth,
  databaseNotConfigured,
} from "@repo/db";
import { healthy, type HealthStatus } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { API_ENV, type ApiEnv } from "../api-env.module.js";
import { DATABASE_CLIENT } from "../db/db.module.js";

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

  constructor(
    @Inject(API_ENV) private readonly env: ApiEnv,
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient | null,
  ) {}

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
    const database = this.db ? await checkDatabase(this.db) : databaseNotConfigured;

    if (database.status === "down") {
      // 503 so Kubernetes / ALB drops the pod from the ready pool.
      throw new HttpException(
        {
          ok: false,
          error: {
            code: "UNAVAILABLE",
            message: "Database not reachable.",
            details: { database: database.message },
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      ok: true,
      data: {
        status,
        service: this.env.PROJECT_SLUG,
        database,
      },
    };
  }

  @Get()
  @HttpCode(200)
  root(): Promise<ApiSuccess<ReadinessBody>> {
    // Preserve `/health` as an alias for `/health/ready` so probes that pre-date
    // the live/ready split keep working.
    return this.readiness();
  }
}
