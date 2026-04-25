import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { DbModule } from "./db/db.module.js";
import { HealthModule } from "./health/health.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { LoggerModule } from "./logger.module.js";
import { MetricsModule } from "./metrics/metrics.module.js";
import { NotesModule } from "./notes/notes.module.js";

/**
 * Global rate-limit baseline: 100 requests per minute per IP, applied
 * via APP_GUARD = ThrottlerGuard. Routes that need a tighter limit
 * use the @Throttle decorator at the handler level (see
 * notes.controller.ts `create`). Products should expose these as env
 * vars on @repo/env/apps/api once the real numbers are known.
 */
@Module({
	imports: [
		ThrottlerModule.forRoot({
			throttlers: [{ name: "default", ttl: 60_000, limit: 100 }],
		}),
		DbModule,
		LoggerModule,
		AuthModule,
		HealthModule,
		JobsModule,
		MetricsModule,
		NotesModule,
	],
	controllers: [AppController],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
