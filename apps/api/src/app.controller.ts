import { Controller, Get } from "@nestjs/common";
import type { ApiResponse } from "@repo/contracts";
import { databaseNotConfigured } from "@repo/db";
import { createMemoryCache, healthy, type HealthStatus } from "@repo/infrastructure";
import { parseBaseEnv, runWorkflow } from "@repo/platform";

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
    const env = parseBaseEnv();
    await runWorkflow(this.cache.set("health:last-check", new Date().toISOString()));

    return {
      ok: true,
      data: {
        database: databaseNotConfigured,
        service: env.PROJECT_SLUG,
        status: await runWorkflow(this.health.check()),
      },
    };
  }
}
