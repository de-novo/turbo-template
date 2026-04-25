import { Controller, Get } from "@nestjs/common";
import type { ApiResponse } from "@repo/contracts";
import { databaseNotConfigured } from "@repo/db";
import { loadApiEnv } from "@repo/env/apps/api";
import { createMemoryCache, healthy, type HealthStatus } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { logger } from "./logger.js";

type HealthResponse = {
  service: string;
  status: HealthStatus;
  database: typeof databaseNotConfigured;
};

@Controller()
export class AppController {
  private readonly cache = createMemoryCache();
  private readonly health = healthy("api");

  @Get("/health")
  async healthCheck(): Promise<ApiResponse<HealthResponse>> {
    const env = loadApiEnv();
    await runWorkflow(this.cache.set("health:last-check", new Date().toISOString()));
    const status = await runWorkflow(this.health.check());

    logger.log({
      level: "info",
      message: "Health check completed.",
      details: { status },
    });

    return {
      ok: true,
      data: {
        database: databaseNotConfigured,
        service: env.PROJECT_SLUG,
        status,
      },
    };
  }
}
