import type { ApiEnv } from "@repo/env/apps/api";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";

/**
 * Better Auth instance for AUTH_MODE=better-auth-embedded (the default).
 *
 * The shipped configuration uses an in-process memory adapter so the API boots
 * without a database — sessions are kept in `apps/api`'s heap and lost on
 * restart. That is fine for solo / demo flows; production deployments should
 * swap `memoryAdapter(...)` for the Drizzle adapter and back it with the
 * `BETTER_AUTH_SECRET`-protected schema in `packages/db`.
 *
 * See `docs/auth-recipes/external-oidc.md` for the path that does NOT use
 * Better Auth at all (third-party IdP owns login).
 */
export function createAuth(env: ApiEnv) {
  // Better Auth's memory adapter does not auto-create the schema; pre-seed each
  // model name as an empty array so `findOne` / `create` calls succeed.
  const memoryStore: MemoryDB = {
    user: [],
    session: [],
    account: [],
    verification: [],
  };

  return betterAuth({
    database: memoryAdapter(memoryStore),
    secret: env.BETTER_AUTH_SECRET ?? "local-only-change-me-change-me-32",
    baseURL: env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`,
    emailAndPassword: {
      enabled: true,
    },
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;
