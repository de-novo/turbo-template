import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { loadApiEnv } from "@repo/env/apps/api";
import { ApiEnvModule } from "./api-env.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DbModule } from "./db/db.module.js";
import { AppErrorFilter } from "./filters/app-error.filter.js";
import { HealthModule } from "./health/health.module.js";
import { jobsModule } from "./jobs/jobs.module.js";
import { MeModule } from "./me/me.module.js";
import { MetricsModule } from "./metrics/metrics.module.js";
import { NotesModule } from "./notes/notes.module.js";
import { OpenApiModule } from "./openapi/openapi.module.js";

const env = loadApiEnv();

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
    }),
    ApiEnvModule,
    DbModule,
    AuthModule,
    HealthModule,
    MetricsModule,
    NotesModule,
    MeModule,
    OpenApiModule,
    jobsModule(env.JOBS_ENABLED),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppErrorFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
