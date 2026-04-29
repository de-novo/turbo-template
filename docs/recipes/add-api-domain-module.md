# Add an API domain module

The canonical example lives at `apps/api/src/notes/`. A new domain module follows the same shape:
**contract first**, then service, then controller, then test, then `docs/api/<resource>.md`. Keep
each step boring — the value is the consistency, not the cleverness.

This recipe assumes a hypothetical `orders` domain. Substitute as needed.

## 1. Define the contract in `@repo/contracts`

`packages/contracts/src/orders.ts`:

```ts
import { z } from "zod";

export const orderSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  totalCents: z.number().int().nonnegative(),
  status: z.enum(["pending", "paid", "shipped", "cancelled"]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Order = z.infer<typeof orderSchema>;

export const createOrderBodySchema = orderSchema.pick({ customerId: true, totalCents: true });
export const updateOrderStatusBodySchema = orderSchema.pick({ status: true });
export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
```

Then export from `packages/contracts/src/index.ts`:

```ts
export * from "./orders.js";
```

> **Why:** the contract is the source of truth for runtime validation (the API's
> `ZodValidationPipe`) and for the documentation referenced by `docs/api/<resource>.md`. One change,
> both surfaces updated.

## 2. Service: pure logic, no HTTP

`apps/api/src/orders/orders.service.ts`:

```ts
import { Injectable } from "@nestjs/common";
import { AppError } from "@repo/platform";
import type { ListOrdersQuery, Order } from "@repo/contracts";

@Injectable()
export class OrdersService {
  private readonly orders = new Map<string, Order>();

  list(query: ListOrdersQuery): { items: Order[]; total: number } {
    const all = [...this.orders.values()];
    const start = (query.page - 1) * query.pageSize;
    return { items: all.slice(start, start + query.pageSize), total: all.length };
  }

  get(id: string): Order {
    const order = this.orders.get(id);
    if (!order) throw new AppError("NOT_FOUND", `Order ${id} not found.`);
    return order;
  }

  // create / update / delete elided — same shape as NotesService
}
```

> **Why throw `AppError`, not Nest's `HttpException`?** `AppError` is the cross-package taxonomy
> from `@repo/platform`; the global `AppErrorFilter` (registered in `app.module.ts`) maps it to the
> `{ ok: false, error: { code, message } }` envelope. Using Nest's exceptions bypasses that
> envelope.

## 3. Controller: thin, validation at the boundary

`apps/api/src/orders/orders.controller.ts`:

```ts
import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  type ApiResponse,
  createOrderBodySchema,
  type ListOrdersQuery,
  listOrdersQuerySchema,
  type Order,
  type Paginated,
} from "@repo/contracts";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { OrdersService } from "./orders.service.js";

const listPipe = new ZodValidationPipe(listOrdersQuerySchema);
const createPipe = new ZodValidationPipe(createOrderBodySchema);

@Controller("/orders")
export class OrdersController {
  // tsx (used for `pnpm dev`) does not emit `design:paramtypes`, so explicit
  // `@Inject(Class)` is required for class-based DI to resolve at runtime.
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  list(@Query(listPipe) query: ListOrdersQuery): ApiResponse<Paginated<Order>> {
    /* … */
  }

  @Post()
  create(@Body(createPipe) body: { customerId: string; totalCents: number }): ApiResponse<Order> {
    /* … */
  }
}
```

> **Watch out:** if you hit `Cannot resolve dependency` at boot, the constructor's `@Inject(Class)`
> is the fix. We don't run `tsc` in dev (tsx is faster), so decorator metadata isn't emitted.

## 4. Module + register in `AppModule`

`apps/api/src/orders/orders.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
```

Add to `apps/api/src/app.module.ts` `imports: [...]`.

## 5. Test the controller against an in-memory Nest app

`apps/api/src/orders/orders.controller.test.ts`: copy the structure of
`apps/api/src/notes/notes.controller.test.ts`. Use `Test.createTestingModule({...})` and
`request(app.getHttpServer()).post("/orders")...`. Register the `AppErrorFilter` so error envelopes
look like prod; **do not** register a global `ValidationPipe` (it pulls `class-validator`, which the
template doesn't ship).

## 6. Document the route in `docs/api/<resource>.md`

Create `docs/api/orders.md` (or extend an existing file if the new route belongs to an existing
resource group). Mirror the format of [`docs/api/notes.md`](../api/notes.md) — header + routes
table + errors table + auth posture + curl block. Add the new file to the index in
[`docs/api/README.md`](../api/README.md).

The recipe at [`document-an-api-route.md`](./document-an-api-route.md) documents the convention.
There is no automated drift gate; reviewers flag PRs that change the API surface but not the docs.

## 7. Verify

```bash
pnpm --filter @repo/contracts build      # if other packages import the new types
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm dev:api                              # curl https://api.fullstack-typescript-template.localhost/orders
```

The new routes should respond as expected; the matching shapes should appear in
`docs/api/orders.md`.
