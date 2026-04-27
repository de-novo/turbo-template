import { Module } from "@nestjs/common";
import type { DatabaseClient } from "@repo/db";
import type { ApiEnv } from "@repo/env/apps/api";
import { ApiEnvModule, API_ENV } from "../api-env.module.js";
import { DATABASE_CLIENT, DbModule } from "../db/db.module.js";
import { type AuthInstance, createAuth } from "./auth.js";
import { AUTH_INSTANCE } from "./auth.tokens.js";
import { AuthenticatedGuard } from "./guards/authenticated.guard.js";

export { AUTH_INSTANCE };

/**
 * Provides the Better Auth instance to the rest of apps/api when
 * `AUTH_MODE=better-auth-embedded`, and `null` otherwise (the API runs but the
 * authenticated guard rejects every request — see `AuthenticatedGuard`).
 *
 * `main.ts` pulls the same instance via `app.get(AUTH_INSTANCE)` and mounts it
 * on the raw Express adapter at `/api/auth/*`, so the public surface and the
 * guard read the same session store.
 */
@Module({
  imports: [ApiEnvModule, DbModule],
  providers: [
    {
      provide: AUTH_INSTANCE,
      useFactory: (env: ApiEnv, db: DatabaseClient | null): AuthInstance | null => {
        if (env.AUTH_MODE !== "better-auth-embedded") return null;
        return createAuth(env, db ?? undefined);
      },
      inject: [API_ENV, DATABASE_CLIENT],
    },
    AuthenticatedGuard,
  ],
  exports: [AUTH_INSTANCE, AuthenticatedGuard],
})
export class AuthModule {}
