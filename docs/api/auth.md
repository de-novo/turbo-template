# Auth

Two distinct surfaces:

1. **`/api/auth/*`** — Better Auth's full auth surface (sign-in, sign-up, sign-out, session lookup,
   password reset, etc.). Mounted in [`apps/api/src/main.ts`](../../apps/api/src/main.ts) via the
   raw Express adapter so Better Auth's internal routing keeps the prefix.
2. **`/me`** — Reference protected endpoint demonstrating `AuthenticatedGuard` + `@CurrentUser()`.
   Pattern any new protected route in `apps/api/src/<resource>/` should mirror.

The auth strategy itself (embedded Better Auth vs external OIDC vs SSO gateway vs
central-auth-service) is selectable via `AUTH_MODE` / `AUTH_TOPOLOGY` env. See
[`docs/template-strategy.md`](../template-strategy.md) and the recipes under
[`docs/auth-recipes/`](../auth-recipes/).

## Better Auth surface

- **Mount path:** `/api/auth/*`
- **Backed by:** the Better Auth instance built in
  [`apps/api/src/auth/auth.ts`](../../apps/api/src/auth/auth.ts).
- **Storage:** Drizzle adapter when `DATABASE_URL` is set; otherwise the Better Auth in-process
  memory adapter (sessions lost on restart).
- **Throttle:** the global 100 req / min / IP applies, plus a tighter per-route limit on the auth
  surface — `5 attempts per 15 minutes per IP` for sign-in / sign-up to slow down credential
  stuffing. Wired in `apps/api/src/auth/auth.module.ts`.
- **Session shape:** `@repo/auth/session.ts → sessionSchema`.

Per-route detail is owned by Better Auth, not by this template — refer to the
[Better Auth API reference](https://www.better-auth.com/docs/concepts/api). The endpoint catalog
will change with Better Auth versions; consult their docs rather than enumerating routes here.

## `/me` reference route

| Method | Path  | Status | Auth             | Throttle | Request | Response                                                           |
| ------ | ----- | ------ | ---------------- | -------- | ------- | ------------------------------------------------------------------ |
| GET    | `/me` | 200    | session required | global   | —       | `{ ok: true, data: { id: string, email: string, name?: string } }` |

Source: [`apps/api/src/me/me.controller.ts`](../../apps/api/src/me/me.controller.ts).

### Errors

| Code           | When                                                   |
| -------------- | ------------------------------------------------------ |
| `UNAUTHORIZED` | No Better Auth session cookie / header on the request. |
| `RATE_LIMITED` | Global 100 req / min / IP throttle exceeded.           |

### Curl

```bash
# After signing in via /api/auth/sign-in/email, the response sets a
# session cookie. Reuse it in subsequent requests:
curl --cookie 'better-auth.session_token=...' http://localhost:4000/me
```

## Adding a protected route

Mirror `/me`:

```ts
import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard.js";
import { CurrentUser, type SessionUser } from "../auth/decorators/current-user.decorator.js";

@Controller("/projects")
@UseGuards(AuthenticatedGuard)
export class ProjectsController {
  @Get()
  list(@CurrentUser() user: SessionUser) {
    return { ok: true, data: { ownerId: user.id, items: [] } };
  }
}
```

See the recipe at [`docs/recipes/protect-an-api-route.md`](../recipes/protect-an-api-route.md) for
the full pattern (guard wiring, error envelope, test fixture).
