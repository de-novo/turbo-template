import { authSchema, type DatabaseClient } from "@repo/db";
import type { ApiEnv } from "@repo/env/apps/api";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";

/**
 * Better Auth instance for AUTH_MODE=better-auth-embedded (the default).
 *
 * - When a `DatabaseClient` is provided (DATABASE_URL is set), uses the Drizzle
 *   adapter against `packages/db/src/schema/auth.ts`. Sessions persist across
 *   restarts. This is the production path.
 * - When no `DatabaseClient` is passed, falls back to the in-process memory
 *   adapter so the API still boots without a database. Memory state is lost
 *   on restart and must NOT be used in production.
 *
 * See `docs/auth-recipes/external-oidc.md` for the path that does NOT use
 * Better Auth at all (third-party IdP owns login).
 */
export function createAuth(env: ApiEnv, db?: DatabaseClient) {
  const database = db
    ? drizzleAdapter(db.db, { provider: "pg", schema: authSchema })
    : memoryAdapter({
        // Better Auth's memory adapter does not auto-create the schema;
        // pre-seed each model name as an empty array so `findOne` / `create`
        // calls succeed.
        user: [],
        session: [],
        account: [],
        verification: [],
      } satisfies MemoryDB);

  return betterAuth({
    database,
    secret: env.BETTER_AUTH_SECRET ?? "local-only-change-me-change-me-32",
    baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
    emailAndPassword: {
      enabled: true,
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
