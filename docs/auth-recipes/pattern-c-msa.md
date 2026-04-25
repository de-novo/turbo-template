# Pattern C — split auth into a dedicated service

Use this recipe when you want a standalone auth service (MSA). Other services
stop owning auth state; they consume sessions via HTTP and validate results
using the `@repo/auth` contracts.

## Steps from default (Pattern B) template

### 1. Create `apps/auth-service`

Copy `apps/api` as a starting point:

```bash
cp -r apps/api apps/auth-service
```

Edit `apps/auth-service/package.json`:

- Rename to `@repo/auth-service`
- Drop non-auth deps: `@repo/infrastructure`, `@repo/platform` (keep if you
  want shared logging/health here too)
- Keep: `@repo/auth`, `@repo/auth-server`, `@repo/db`, `better-auth`

Keep only the auth-related controllers: `apps/auth-service/src/app.module.ts`
should import only `AuthModule` and expose a minimal health check. Remove
`/me` from the default `AppController` here — `/me` belongs in consumer
services.

Assign a dedicated port (e.g. 4001) in `apps/auth-service/src/env.ts` default.

### 2. Point the DB

Either:
- Share the existing database (simpler), or
- Create a separate database owned by auth-service (true MSA) and run
  `pnpm db:migrate` against it. The four tables (user, session, account,
  verification) move here.

### 3. Strip auth out of `apps/api`

- Delete `apps/api/src/auth/auth.module.ts` and `auth.service.ts` and
  `auth.controller.ts`
- Keep `auth.guard.ts`, `current-user.decorator.ts`, and `types.ts` — they
  become the **consumer-side** validators (modified in step 4)
- Remove `@repo/auth-server`, `better-auth` from `apps/api/package.json`
- Keep `@repo/auth` — it still owns the contracts

### 4. Replace guard with an HTTP-based session validator

Create `apps/api/src/auth/session-client.ts`:

```ts
import { sessionSchema, type Session } from "@repo/auth";

export async function fetchSession(cookie: string, authServiceUrl: string): Promise<Session | null> {
  const res = await fetch(`${authServiceUrl}/auth/get-session`, {
    headers: { cookie },
  });
  if (!res.ok) return null;
  const raw = await res.json();
  const parsed = sessionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
```

Update `auth.guard.ts` to call `fetchSession` instead of Better Auth directly.
Inject `AUTH_SERVICE_URL` via env (new required env var in `apps/api/src/env.ts`).

### 5. Service-to-service calls

For server-initiated calls between non-auth services (e.g., worker → api),
skip cookie-based sessions and use **service-auth JWTs** defined in
`packages/auth/src/service-auth.ts`:

```ts
import { serviceTokenClaimsSchema } from "@repo/auth";

// Verify incoming service token:
const claims = serviceTokenClaimsSchema.parse(await verifyJwt(token, publicKey));
```

The auth-service issues these tokens on behalf of clients. Implementation of
the signing/verification is left to each project's KMS/JWKS strategy (out of
scope for the template).

### 6. Run the gate

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Start two services locally:

```bash
pnpm --filter @repo/auth-service dev  # port 4001
pnpm --filter @repo/api dev           # port 4000
```

### 7. Update web client

Point Better Auth client (or fetch calls) at the auth-service's `/auth/*`
routes rather than the api. Consumer routes (`/me`, business endpoints) stay
on the api.

## What stayed the same

- `packages/auth` contracts — the shared vocabulary for session, identity,
  permissions, and service-auth JWT claims
- `packages/auth-server` factory — moved from `apps/api` to `apps/auth-service`
  with zero changes
- `packages/db` schema — same four tables; possibly owned by auth-service now
- `.env.example` — variables carry over, split across two services
