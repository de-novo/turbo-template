# Protect an API route

The template ships an `AuthenticatedGuard` + `@CurrentUser()` decorator pair under
`apps/api/src/auth/`. The reference endpoint is `GET /me` (`apps/api/src/me/`). This recipe shows
how to lock down a new route and read the authenticated user inside the handler.

> **Scope:** this guard validates Better Auth sessions when `AUTH_MODE=better-auth-embedded` (the
> default). The other three modes (`external-oidc`, `sso-gateway`, `central-auth-service`) push
> session ownership upstream — the API consumes forwarded claims via JWT or trusted headers, and the
> guard there is yours to write. See [docs/auth-recipes/](../auth-recipes/) for those modes.

## 1. Add the guard to the route

```ts
import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type SessionUser } from "../auth/decorators/current-user.decorator.js";
import { AuthenticatedGuard } from "../auth/guards/authenticated.guard.js";
import { OrdersService } from "./orders.service.js";

@Controller("/orders")
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(AuthenticatedGuard)
  create(@Body() body: CreateOrderBody, @CurrentUser() user: SessionUser) {
    return { ok: true, data: this.orders.create({ ...body, customerId: user.id }) };
  }
}
```

`@UseGuards(AuthenticatedGuard)` runs before the handler. On a missing or expired session it throws
`AppError({ code: "UNAUTHORIZED", … })`, which the global `AppErrorFilter` maps to the canonical
`{ ok: false, error: { code: "UNAUTHORIZED", message } }` envelope at HTTP 401.

`@CurrentUser()` reads the user that the guard attached to the request — undefined unless the route
is gated by `AuthenticatedGuard`, so always pair the two.

## 2. Make sure the controller's module imports `AuthModule`

`apps/api/src/orders/orders.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

`AuthModule` exports both `AUTH_INSTANCE` (the Better Auth handle) and `AuthenticatedGuard`. Without
this import, Nest can't resolve the guard at boot.

## 3. Apply at the controller level for whole-resource gates

If every route in a controller needs auth, hoist `@UseGuards`:

```ts
@Controller("/admin")
@UseGuards(AuthenticatedGuard)
export class AdminController {
  /* every method below requires a session */
}
```

Mix it with method-level overrides if you need a public escape hatch.

## 4. Update the OpenAPI document

Add a `"401"` response (using the existing `PublicError` schema) to the route's responses block in
`apps/api/src/openapi/openapi.config.ts`. The drift-guard test asserts schema parity, but doesn't
check that protected routes are documented — keep them in sync by hand.

## 5. Test it

`apps/api/src/me/me.controller.test.ts` is the canonical pattern. The shape:

```ts
test("GET /protected without a session returns 401", async () => {
  const res = await request(server).get("/protected");
  expect(res.status).toBe(401);
  expect(res.body.error.code).toBe("UNAUTHORIZED");
});

test("GET /protected with a session cookie returns 200", async () => {
  // Mount Better Auth on the test app's Express adapter so we can sign up
  // and reuse the cookie. See me.controller.test.ts for the wiring.
  const cookieHeader = await signUpAndGetCookie(server, email);
  const res = await request(server).get("/protected").set("cookie", cookieHeader);
  expect(res.status).toBe(200);
});
```

## 6. Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm dev:api
# curl -i http://localhost:4000/protected                # → 401
# Then sign up via /api/auth/sign-up/email and reuse the session cookie.
```

## What this guard does NOT do

- **Authorization (RBAC, ownership checks)** — `AuthenticatedGuard` answers "is anyone signed in?",
  not "is this user allowed to touch this resource?". Add a second guard for that, parameterized via
  `@SetMetadata`.
- **Multi-mode auth** — see the scope note at the top.
- **Rate limiting per user** — global throttling lives in `ThrottlerModule` (registered in
  `app.module.ts`); per-user limits would mean a custom `ThrottlerGuard` reading `req.user.id`.
