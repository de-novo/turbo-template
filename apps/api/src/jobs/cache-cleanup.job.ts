import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { createMemoryCache } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";

/**
 * Reference cron job. Runs once an hour, records a sentinel value into
 * the in-memory cache, and logs the result. Use it as the wiring
 * template for any real cron — daily digest, expired-session cleanup,
 * webhook retry sweep, etc.
 *
 * Reasons this is intentionally minimal:
 *
 * - Cron expressions live with the code (decorator), so the schedule is
 *   reviewable in PRs alongside the work it triggers.
 * - Logger is injected via NestJS so the output participates in the
 *   shared Pino redact/format rules from logger.module.ts.
 * - The work itself uses @repo/infrastructure's memory cache so the
 *   reference compiles without a live Redis. Swap for a real adapter
 *   when the product chooses one.
 */
@Injectable()
export class CacheCleanupJob {
	private readonly logger = new Logger(CacheCleanupJob.name);
	private readonly cache = createMemoryCache();

	@Cron(CronExpression.EVERY_HOUR)
	async sweep(): Promise<void> {
		const stamp = new Date().toISOString();
		await runWorkflow(this.cache.set("jobs:cache-cleanup:last-run", stamp));
		this.logger.debug(`cache cleanup pass at ${stamp}`);
	}
}
