# Enable job queue

The template ships the job queue contract (per ADR [0007](../adr/0007-job-queue-contract.md)) and a
wired `QueueModule` that provides `JOB_QUEUE` defaulting to `noopJobQueue`. The lane is inert until
you (1) wire a real backend and (2) start a worker pool that polls `claimNext`.

## When this applies

You have demand-driven deferred work that doesn't belong in the request path:

- Send a welcome email (~seconds; user shouldn't wait).
- Resize an uploaded image (~seconds-minutes; CPU heavy).
- Import a CSV (~minutes; long-running).
- Call a webhook with retries (~seconds; flaky third party).
- Run a one-off cleanup job kicked off by a user action.

This is _distinct from_ `@nestjs/schedule` cron (time-driven, not demand-driven) and _distinct from_
the outbox (event publish, not work execution). See ADR 0007's context section.

If your fork only needs cron and request-time work, leave `noopJobQueue` in place.

## Step 1 — Pick a backend

| Backend               | Trade-off                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| BullMQ + Redis        | Mature, full-featured (priorities, repeat, sandboxed workers). Requires running Redis.                   |
| pg-boss + Postgres    | Reuses the existing Postgres. No new infra. Fewer features than BullMQ; fine for low/mid throughput.     |
| Inngest               | Hosted; functions defined as TypeScript. Great DX, vendor lock-in, per-event pricing.                    |
| AWS SQS / Cloud Tasks | Managed cloud queue. Cheap at low volume, expensive at high. Fits if your fork already lives in AWS/GCP. |
| Temporal / Restate    | Workflow engines (durable state machines). Right when jobs are multi-step and need replay.               |

For most products: **pg-boss** if Postgres is your only stateful dep, **BullMQ** if you can run
Redis.

## Step 2 — Implement `JobQueue`

For pg-boss (Postgres-backed) — `apps/api/src/queue/pg-boss-queue.ts`:

```ts
import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { JobDescriptor, JobRecord } from "@repo/contracts";
import type { JobQueue } from "@repo/infrastructure";
import { AppError } from "@repo/platform";
import PgBoss from "pg-boss";
import { Effect } from "effect";
import { API_ENV, type ApiEnv } from "../api-env.module.js";

type PgBossHandler<TPayload extends object> = (job: PgBoss.Job<TPayload>) => Promise<void>;

@Injectable()
export class PgBossQueue implements JobQueue, OnModuleInit, OnModuleDestroy {
  private boss: PgBoss;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    if (!env.DATABASE_URL) {
      throw new AppError({ code: "INTERNAL", message: "DATABASE_URL is required for pg-boss." });
    }
    this.boss = new PgBoss(env.DATABASE_URL);
  }

  async onModuleInit() {
    await this.boss.start();
  }
  async onModuleDestroy() {
    await this.boss.stop();
  }

  enqueue(descriptor: JobDescriptor): Effect.Effect<JobRecord, AppError> {
    return Effect.tryPromise({
      try: async () => {
        const opts: PgBoss.SendOptions = {
          retryLimit: descriptor.maxAttempts ?? 3,
          ...(descriptor.idempotencyKey ? { singletonKey: descriptor.idempotencyKey } : {}),
          ...(descriptor.scheduledFor ? { startAfter: new Date(descriptor.scheduledFor) } : {}),
        };
        const id = await this.boss.send(descriptor.name, descriptor.payload as object, opts);
        return {
          ...descriptor,
          maxAttempts: opts.retryLimit ?? 3,
          id: id ?? "deduped",
          status: "pending",
          attempt: 1,
          enqueuedAt: new Date().toISOString(),
        };
      },
      catch: (cause) => new AppError({ code: "INTERNAL", message: "Enqueue failed.", cause }),
    });
  }

  async registerHandler<TPayload extends object>(name: string, handler: PgBossHandler<TPayload>) {
    await this.boss.work<TPayload>(name, handler);
  }

  // pg-boss is handler-driven (`boss.work`) rather than poll-and-ack.
  // Fail fast instead of silently pretending the polling side is active.
  claimNext = () =>
    Effect.fail(new AppError({ code: "UNAVAILABLE", message: "Use registerHandler for pg-boss." }));
  ack = () =>
    Effect.fail(new AppError({ code: "UNAVAILABLE", message: "pg-boss acks inside handlers." }));
  nack = () =>
    Effect.fail(new AppError({ code: "UNAVAILABLE", message: "pg-boss retries thrown handlers." }));
  sizeByStatus = () => Effect.succeed({ pending: 0, running: 0, succeeded: 0, failed: 0 });
}
```

For BullMQ — same shape, swap pg-boss for `Queue`/`Worker` from `bullmq` and use
`connection: { url: REDIS_URL }`.

## Step 3 — Swap the `QueueModule` provider

```ts
import { Module } from "@nestjs/common";
import { ApiEnvModule } from "../api-env.module.js";
import { JOB_QUEUE } from "./queue.tokens.js";
import { PgBossQueue } from "./pg-boss-queue.js";

@Module({
  imports: [ApiEnvModule],
  providers: [PgBossQueue, { provide: JOB_QUEUE, useExisting: PgBossQueue }],
  exports: [JOB_QUEUE],
})
export class QueueModule {}
```

## Step 4 — Define handlers

For pg-boss, register a handler per job name. Put handlers in `apps/api/src/queue/handlers/`:

```ts
// apps/api/src/queue/handlers/welcome-email.handler.ts
import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import type PgBoss from "pg-boss";
import { PgBossQueue } from "../pg-boss-queue.js";

@Injectable()
export class WelcomeEmailHandler implements OnApplicationBootstrap {
  constructor(@Inject(PgBossQueue) private readonly queue: PgBossQueue) {}

  async onApplicationBootstrap() {
    await this.queue.registerHandler(
      "user.welcome.email",
      async (job: PgBoss.Job<{ userId: string }>) => {
        // Call your notifier here (per docs/recipes/enable-notifier.md).
        // pg-boss retries automatically on throw.
      },
    );
  }
}
```

Register handlers in `QueueModule`'s providers.

For a separate worker process (the production-recommended shape), see the parallel pattern in
[`enable-outbox-relay.md`](./enable-outbox-relay.md) Step 4 Option B.

## Step 5 — Enqueue from handlers

```ts
import { Inject } from "@nestjs/common";
import type { JobQueue } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { JOB_QUEUE } from "../queue/queue.tokens.js";

@Controller("/auth")
export class SignupController {
  constructor(@Inject(JOB_QUEUE) private readonly queue: JobQueue) {}

  @Post("signup")
  async signup(@Body() body: SignupBody) {
    const user = await this.users.create(body);
    await runWorkflow(
      this.queue.enqueue({
        name: "user.welcome.email",
        payload: { userId: user.id },
        idempotencyKey: `welcome:${user.id}`,
        maxAttempts: 5,
      }),
    );
    return { ok: true, data: user };
  }
}
```

`idempotencyKey` is the recovery story for "user clicked signup twice / network retried" — the same
key produces only one job.

## Step 6 — Test against the memory queue

`createMemoryJobQueue` covers tests of any handler that enqueues:

```ts
import { createMemoryJobQueue } from "@repo/infrastructure";
import { Effect } from "effect";

const memoryQueue = createMemoryJobQueue();
const moduleRef = await Test.createTestingModule({
  controllers: [SignupController],
  providers: [UserService, { provide: JOB_QUEUE, useValue: memoryQueue }],
}).compile();

test("signup enqueues a welcome email job", async () => {
  await request(server).post("/auth/signup").send({ email: "u@example.com" });

  const job = await Effect.runPromise(memoryQueue.claimNext());
  expect(job?.name).toBe("user.welcome.email");
  expect(job?.idempotencyKey).toMatch(/^welcome:/);
});
```

## Step 7 — Remove the deferred-capabilities entry

`docs/capabilities.md` carries a **Real job queue backend** bullet under "Deferred capabilities".
Delete it once activated.

## Step 8 — Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test

# Start the API + workers (Option A: in-process):
JOBS_ENABLED=true pnpm dev:api

# Trigger a job:
curl -X POST http://localhost:4000/auth/signup -d '{"email":"u@example.com"}'

# pg-boss: verify in Postgres
psql "$DATABASE_URL" -c "select name, state, retry_count from pgboss.job order by created_on desc limit 5;"
```

## Common pitfalls

- **In-process workers on every replica** — same hazard as outbox workers. Either restrict to one
  replica via leader election (some backends like pg-boss handle this; others don't) or run a
  separate worker deploy.
- **Long-running handlers blocking the event loop** — image resize, CSV import. Move to a worker
  process or use the backend's sandboxed-worker feature (BullMQ `processFile`, Inngest steps).
- **Missing `idempotencyKey`** — without it, retries on the producer side enqueue twice. Pick a
  deterministic key (`welcome:${userId}`, `import:${csvHash}`) so duplicates dedupe at the queue.
- **Using the queue for fire-and-forget event publish** — that's outbox territory (per ADR 0005).
  Outbox guarantees publish-once with no retry budget; queue handles work execution with retries.

## References

- ADR [0007 — Job queue contract](../adr/0007-job-queue-contract.md)
- `apps/api/src/queue/queue.module.ts` — wiring
- `packages/contracts/src/job.ts` — `JobDescriptor`, `JobRecord`, `JobStatus`
- `packages/infrastructure/src/queue.ts` — `JobQueue` port + `noopJobQueue` + `createMemoryJobQueue`
- ADR [0005 — Outbox contract](../adr/0005-outbox-contract.md) — distinct concern
- pg-boss docs: <https://github.com/timgit/pg-boss>
- BullMQ docs: <https://docs.bullmq.io/>
