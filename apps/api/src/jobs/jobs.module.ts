import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheCleanupJob } from "./cache-cleanup.job.js";

/**
 * Background job lane. NestJS Schedule registers cron / interval / timeout
 * tasks discovered via decorators on providers in this module.
 *
 * The CacheCleanupJob below is a deliberately minimal reference — it
 * shows the wiring (provider + Cron decorator + logger usage) without
 * pulling in a queue (BullMQ, Inngest) or external scheduler. Replace
 * or extend it as the product needs.
 */
@Module({
	imports: [ScheduleModule.forRoot()],
	providers: [CacheCleanupJob],
	exports: [CacheCleanupJob],
})
export class JobsModule {}
