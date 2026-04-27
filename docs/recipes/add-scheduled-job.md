# Add a scheduled job

The template ships `@nestjs/schedule` with one sample job (`HeartbeatJob`) gated behind
`JOBS_ENABLED=true`. Adding a new cron / interval / timeout follows the same pattern.

## 1. Write the job class

`apps/api/src/jobs/expire-tokens.job.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { API_ENV, type ApiEnv } from "../api-env.module.js";
import { DATABASE_CLIENT } from "../db/db.module.js";
import type { DatabaseClient } from "@repo/db";
import { logger } from "../logger.js";

@Injectable()
export class ExpireTokensJob {
  constructor(
    @Inject(API_ENV) private readonly env: ApiEnv,
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient | null,
  ) {}

  // Run at the top of every hour. Use a string for an explicit cron expression
  // or `CronExpression.EVERY_HOUR` from @nestjs/schedule for the named presets.
  @Cron("0 * * * *", { name: "expire-tokens" })
  async run(): Promise<void> {
    if (!this.db) return; // No DB? Nothing to expire.
    const removed = await this.db.delete(/* expired token rows */);
    logger.log({
      level: "info",
      message: "Expired tokens swept.",
      details: { removed, runAt: new Date().toISOString() },
    });
  }
}
```

> **`@Inject(Class)` is required.** Decorator metadata is not emitted under tsx (`pnpm dev`), so
> Nest can't auto-resolve constructor parameter types.

Trigger options the template uses:

- `@Cron("expression" | CronExpression.X, { name })` — wall-clock schedule.
- `@Interval("name", milliseconds)` — fixed interval after each run completes.
- `@Timeout("name", milliseconds)` — fires once after delay (good for warm-up tasks).

## 2. Register in `jobsModule(enabled)`

`apps/api/src/jobs/jobs.module.ts`:

```ts
import { ExpireTokensJob } from "./expire-tokens.job.js";

// inside the enabled branch of jobsModule(enabled):
return {
  module: JobsModule,
  imports: [ScheduleModule.forRoot(), ApiEnvModule, DbModule],
  providers: [HeartbeatJob, ExpireTokensJob],
};
```

> **Why `jobsModule(enabled)` instead of `JobsModule.forRoot(enabled)`?** Functionally equivalent,
> but Biome's `noStaticOnlyClass` rule flags the static-method form. We keep the `JobsModule` class
> as the marker NestJS uses to identify the module, and expose a top-level factory function.
>
> **Why gate on `enabled`?** `JOBS_ENABLED=false` returns an empty module so cron tasks aren't
> multiplied by the replica count in production. See env README for the leader-election guidance.

## 3. Test the wiring (not the schedule)

Don't try to wait for cron ticks in tests. Instead, verify the job class is registered when enabled
and that its `run()` behaves correctly given mock dependencies.

`apps/api/src/jobs/expire-tokens.job.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ExpireTokensJob } from "./expire-tokens.job.js";

describe("ExpireTokensJob", () => {
  it("is a no-op when no DB is configured", async () => {
    const job = new ExpireTokensJob({} as never, null);
    await expect(job.run()).resolves.not.toThrow();
  });
});
```

For the registration check, follow the existing `apps/api/src/jobs/jobs.module.test.ts`.

## 4. Enable it

Local: `JOBS_ENABLED=true pnpm dev:api`.

Production: enable on **exactly one** replica. The simplest deploy patterns:

- A separate `api-scheduler` workload (same image, different env, replicas = 1).
- A leader-election sidecar (e.g. `@candulabs/k8s-leader-elector`).
- A managed cron service (Kubernetes `CronJob`, Cloud Run scheduled jobs) calling an internal HTTP
  endpoint that performs the work.

The template doesn't ship any of these — pick one when you actually deploy multi-replica.

## 5. Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
JOBS_ENABLED=true pnpm dev:api
# observe: {"msg":"API listening","details":{"jobs":"enabled",...}}
```
