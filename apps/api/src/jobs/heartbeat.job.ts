import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { API_ENV, type ApiEnv } from "../api-env.module.js";
import { logger } from "../logger.js";

/**
 * Sample scheduled job. Logs a heartbeat at info level once per hour so operators
 * can confirm the scheduler thread is alive without scraping metrics. Replace this
 * with real domain jobs (token rotation, expired-session sweep, queue draining,
 * report aggregation, …) — the wiring stays the same.
 *
 * The whole module is opt-in behind `JOBS_ENABLED=true`. In multi-replica
 * deployments, run the scheduler in exactly one replica (separate Helm chart,
 * Kubernetes CronJob, or a leader-election lock) — `@nestjs/schedule` does not
 * coordinate across processes.
 */
@Injectable()
export class HeartbeatJob {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  @Cron(CronExpression.EVERY_HOUR, { name: "heartbeat" })
  tick(): void {
    logger.log({
      level: "info",
      message: "Scheduler heartbeat.",
      details: { service: this.env.PROJECT_SLUG, runAt: new Date().toISOString() },
    });
  }
}
