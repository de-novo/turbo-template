import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ApiEnvModule } from "./api-env.module.js";
import { DbModule } from "./db/db.module.js";
import { AppErrorFilter } from "./filters/app-error.filter.js";
import { HealthModule } from "./health/health.module.js";
import { MetricsModule } from "./metrics/metrics.module.js";
import { NotesModule } from "./notes/notes.module.js";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
    }),
    ApiEnvModule,
    DbModule,
    HealthModule,
    MetricsModule,
    NotesModule,
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
