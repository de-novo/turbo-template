# Pattern A — mount Better Auth in `apps/web`

Use this recipe when your product has **only a web surface** or the web app
owns session truth. Better Auth runs as a Next.js route handler; the API (if
any) only reads sessions from the shared database or proxies to web.

## Steps from default (Pattern B) template

### 1. Add `@repo/auth-server` to `apps/web`

```jsonc
// apps/web/package.json
"dependencies": {
  "@repo/auth-server": "workspace:*",
  // ...existing
}
```

Run `pnpm install`.

### 2. Create the Better Auth instance in web

`apps/web/src/lib/auth.ts`:

```ts
import { createAuth } from "@repo/auth-server";
import { createDatabaseClient } from "@repo/db";
import { parseWebEnv } from "../env";

const env = parseWebEnv();
const { db } = createDatabaseClient({ connectionString: env.DATABASE_URL });

export const auth = createAuth({
  db,
  baseURL: env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
});
```

Extend `apps/web/src/env.ts` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, and
`NEXT_PUBLIC_APP_URL`.

### 3. Mount the catch-all route handler

`apps/web/src/app/api/auth/[...all]/route.ts`:

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

### 4. Remove the NestJS auth module from `apps/api`

- Delete `apps/api/src/auth/`
- Remove `AuthModule` from `apps/api/src/app.module.ts`
- Remove `@repo/auth-server`, `@repo/auth`, `better-auth` from
  `apps/api/package.json`
- If the API still needs to know who the caller is, either:
  - Read the shared `session` table directly with `@repo/db`, validating
    the resulting row against `@repo/auth`'s `sessionSchema`, or
  - Call `GET /api/auth/get-session` on the web app

### 5. Run the gate

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

## What stayed the same

- `packages/auth` and `packages/auth-server` — untouched
- `packages/db` schema (user, session, account, verification) — untouched
- `.env.example` — the auth variables still apply, just consumed in web
