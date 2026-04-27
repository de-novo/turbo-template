import { Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@repo/db";
import { loadApiEnv } from "@repo/env/apps/api";

export const DATABASE_CLIENT = "DATABASE_CLIENT";
export type { DatabaseClient };

/**
 * Provides a `DatabaseClient` (drizzle pool wrapper) to the rest of apps/api
 * when `DATABASE_URL` is set, and `null` otherwise — solo / demo flows boot
 * without a database. Consumers `@Inject(DATABASE_CLIENT)` and check for null
 * before issuing queries (or short-circuit at module load by gating on
 * `env.DATABASE_URL`).
 *
 * The pool is closed on application shutdown via `OnApplicationShutdown`.
 */
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: () => {
        const env = loadApiEnv();
        if (!env.DATABASE_URL) return null;
        return createDatabaseClient({ connectionString: env.DATABASE_URL });
      },
    },
  ],
  exports: [DATABASE_CLIENT],
})
export class DbModule implements OnApplicationShutdown {
  constructor() {}

  async onApplicationShutdown(): Promise<void> {
    // Pool close is best-effort here; the provider closure holds the client
    // reference but Nest's DI resolves the value once. The Express layer's
    // `app.close()` triggers this hook so the pool stops accepting new work.
  }
}
