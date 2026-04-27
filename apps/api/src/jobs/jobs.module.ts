import { type DynamicModule, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ApiEnvModule } from "../api-env.module.js";
import { HeartbeatJob } from "./heartbeat.job.js";

/**
 * Optional scheduled-jobs module. Enabled when `JOBS_ENABLED=true`; otherwise the
 * module produces an empty registration so multi-replica deployments don't
 * accidentally run cron tasks in every pod. See `heartbeat.job.ts` for the
 * sample job and the leader-election warning.
 *
 * `JobsModule` is the marker class Nest uses to identify the module instance
 * — `jobsModule(enabled)` is the factory consumers call. We don't expose a
 * `JobsModule.forRoot` static because Biome's `noStaticOnlyClass` rule flags
 * the (otherwise idiomatic) NestJS dynamic-module shape, and we'd rather keep
 * the rule on than ignore it.
 */
@Module({})
export class JobsModule {}

export function jobsModule(enabled: boolean): DynamicModule {
  if (!enabled) {
    return { module: JobsModule };
  }
  return {
    module: JobsModule,
    imports: [ScheduleModule.forRoot(), ApiEnvModule],
    providers: [HeartbeatJob],
  };
}
