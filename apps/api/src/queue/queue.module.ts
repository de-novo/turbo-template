import { Module } from "@nestjs/common";
import { noopJobQueue } from "@repo/infrastructure";
import { JOB_QUEUE } from "./queue.tokens.js";

/**
 * Provides the active `JobQueue` for demand-driven deferred work.
 * Default is `noopJobQueue` — `enqueue` accepts silently and
 * `claimNext` always returns `null`. The lane is inert until a fork
 * swaps the provider (recipe at `docs/recipes/enable-job-queue.md`)
 * AND starts a worker pool that polls `claimNext`.
 *
 * Distinct from `@nestjs/schedule` (cron, time-driven) and from the
 * outbox (event publish, no per-message retry budget). See ADR 0007.
 */
@Module({
  providers: [
    {
      provide: JOB_QUEUE,
      useValue: noopJobQueue,
    },
  ],
  exports: [JOB_QUEUE],
})
export class QueueModule {}
