# Enable outbox relay

The template ships the outbox contract (per ADR [0005](../adr/0005-outbox-contract.md)) — Drizzle
table + Zod row + Effect-typed `OutboxRelay` port — and a wired `OutboxModule` that provides
`OUTBOX_RELAY` defaulting to `noopOutboxRelay`. The lane is inert until you (1) write a real relay
against your bus and (2) mount a worker that drains the table.

## When this applies

You have a domain mutation that _also_ needs to publish a message (Kafka topic, SNS subscription,
webhook to a partner, internal event grid). The dual-write problem is the trigger:

- Right now: the handler commits the DB, then `await publisher.publish(event)` — if publish fails
  after commit, the state is inconsistent.
- With outbox: the handler writes the event to the `outbox` table inside the same transaction as the
  business mutation. A relay process reads pending rows and forwards them to the bus.

If your fork doesn't publish events to a bus today and isn't about to, leave `noopOutboxRelay` in
place.

## Step 1 — Pick a relay strategy

| Strategy                          | Trade-off                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Postgres polling worker           | Simplest. Run `claimBatch` on a tick (every 200ms-2s). One DB query per tick. Fine for thousands of events/sec.          |
| Postgres `LISTEN/NOTIFY` worker   | Push-based. Trigger on `outbox` table fires `NOTIFY`; worker wakes on `LISTEN`. Lower latency than polling, more setup.  |
| Debezium CDC                      | Reads Postgres WAL directly, ships changes to Kafka without app code. Strongest decoupling; heaviest operational burden. |
| Inngest / managed worker platform | Relay logic lives in a hosted service. Trade per-event cost for ops simplicity.                                          |

For most products, **polling worker** is the right starting point. A 1-second tick + `LIMIT 100` per
claim handles tens of millions of events/day without strain.

## Step 2 — Implement `OutboxRelay`

Create `apps/api/src/outbox/postgres-outbox-relay.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import type { OutboxEntry } from "@repo/contracts";
import { type DatabaseClient, outbox } from "@repo/db";
import type { OutboxRelay } from "@repo/infrastructure";
import { AppError } from "@repo/platform";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { Effect } from "effect";
import { DATABASE_CLIENT } from "../db/db.module.js";

@Injectable()
export class PostgresOutboxRelay implements OutboxRelay {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  claimBatch(limit: number): Effect.Effect<OutboxEntry[], AppError> {
    return Effect.tryPromise({
      try: async () => {
        // SELECT FOR UPDATE SKIP LOCKED is the canonical claim pattern —
        // multiple workers don't fight over the same rows.
        const rows = await this.db.db
          .select()
          .from(outbox)
          .where(isNull(outbox.publishedAt))
          .orderBy(outbox.createdAt)
          .limit(limit)
          .for("update", { skipLocked: true });
        return rows.map(this.toEntry);
      },
      catch: (cause) => new AppError({ code: "INTERNAL", message: "Outbox claim failed.", cause }),
    });
  }

  markPublished(ids: ReadonlyArray<string>): Effect.Effect<void, AppError> {
    return Effect.tryPromise({
      try: async () => {
        if (ids.length === 0) return;
        await this.db.db
          .update(outbox)
          .set({ publishedAt: new Date() })
          .where(inArray(outbox.id, ids as string[]));
      },
      catch: (cause) =>
        new AppError({ code: "INTERNAL", message: "Outbox markPublished failed.", cause }),
    });
  }

  markFailed(id: string, reason: string): Effect.Effect<void, AppError> {
    return Effect.tryPromise({
      try: async () => {
        await this.db.db
          .update(outbox)
          .set({
            attemptCount: sql`${outbox.attemptCount} + 1`,
            lastError: reason,
          })
          .where(eq(outbox.id, id));
      },
      catch: (cause) =>
        new AppError({ code: "INTERNAL", message: "Outbox markFailed failed.", cause }),
    });
  }

  private toEntry = (row: typeof outbox.$inferSelect): OutboxEntry => ({
    id: row.id,
    topic: row.topic,
    eventName: row.eventName,
    eventVersion: row.eventVersion,
    payload: row.payload,
    metadata: row.metadata as OutboxEntry["metadata"],
    ...(row.tenantId ? { tenantId: row.tenantId } : {}),
    createdAt: row.createdAt.toISOString(),
    ...(row.publishedAt ? { publishedAt: row.publishedAt.toISOString() } : {}),
    ...(row.lastError ? { lastError: row.lastError } : {}),
    attemptCount: row.attemptCount,
  });
}
```

## Step 3 — Swap the `OutboxModule` provider

```ts
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { OUTBOX_RELAY } from "./outbox.tokens.js";
import { PostgresOutboxRelay } from "./postgres-outbox-relay.js";

@Module({
  imports: [DbModule],
  providers: [PostgresOutboxRelay, { provide: OUTBOX_RELAY, useExisting: PostgresOutboxRelay }],
  exports: [OUTBOX_RELAY],
})
export class OutboxModule {}
```

## Step 4 — Mount a worker

The relay is a _port_; you still need a _worker_ that calls `claimBatch` on a tick and forwards to
your bus. Two options:

### Option A — In-process worker via `@nestjs/schedule`

Acceptable for solo deploys and small-volume workloads. Runs in the same process as the API, gated
by `JOBS_ENABLED` so multi-replica deployments don't double-publish.

`apps/api/src/outbox/outbox-worker.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import type { OutboxRelay } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { OUTBOX_RELAY } from "./outbox.tokens.js";

@Injectable()
export class OutboxWorker {
  constructor(@Inject(OUTBOX_RELAY) private readonly relay: OutboxRelay) {}

  @Interval(1000)
  async drain() {
    const entries = await runWorkflow(this.relay.claimBatch(100));
    if (entries.length === 0) return;

    const succeeded: string[] = [];
    for (const entry of entries) {
      try {
        await publishToBus(entry); // your bus client
        succeeded.push(entry.id);
      } catch (err) {
        await runWorkflow(this.relay.markFailed(entry.id, String(err)));
      }
    }
    if (succeeded.length > 0) {
      await runWorkflow(this.relay.markPublished(succeeded));
    }
  }
}
```

Register in `OutboxModule`'s providers and gate behind `JOBS_ENABLED` (the existing pattern in
`apps/api/src/jobs/`).

### Option B — Separate worker process (recommended for prod)

Better operational story: a dedicated `apps/worker/` deploy that imports the relay + handlers but no
HTTP routes. Lets you scale the worker pool independently of the web replicas, and a worker crash
doesn't affect serving traffic.

The structure mirrors `apps/api`:

```
apps/worker/
├── src/
│   ├── main.ts          # bootstrap a NestJS app with no controllers
│   ├── worker.module.ts # imports OutboxModule + DbModule
│   └── outbox-worker.ts # the @Interval job
├── package.json
└── tsconfig.json
```

Build the same Docker image; the runtime command is `node dist/worker/main.js` instead of
`node dist/api/main.js`.

## Step 5 — Insert from domain code

Outbox writes happen inside the application's existing DB transaction. The handler calls
`tx.insert(outbox).values(...)` directly:

```ts
import { outbox, type DatabaseClient } from "@repo/db";

async createNote(input: CreateNoteBody): Promise<Note> {
  return this.db.db.transaction(async (tx) => {
    const [note] = await tx.insert(notes).values(input).returning();
    await tx.insert(outbox).values({
      topic: "notes",
      eventName: "notes.created",
      eventVersion: "1",
      payload: { id: note.id, title: note.title },
      metadata: {
        eventId: crypto.randomUUID(),
        eventName: "notes.created",
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
      },
      tenantId: getTenantContext()?.tenantId,
    });
    return note;
  });
}
```

The relay forwards the row asynchronously — your handler returns as soon as the transaction commits.

## Step 6 — Test

The memory adapter (`createMemoryOutboxRelay` from `@repo/infrastructure`) covers unit tests of the
worker loop and of domain code that inserts outbox rows. Use `enqueue` (memory-only helper) to seed
pending rows, then verify `claimBatch` and `markPublished` behavior.

```ts
import { createMemoryOutboxRelay } from "@repo/infrastructure";
import { Effect } from "effect";

test("worker forwards pending entries and marks published", async () => {
  const relay = createMemoryOutboxRelay();
  await Effect.runPromise(relay.enqueue({ ...sampleEntry }));

  const worker = new OutboxWorker(relay);
  await worker.drain();

  expect(await Effect.runPromise(relay.pendingCount())).toBe(0);
});
```

## Step 7 — Remove the deferred-capabilities entry

`docs/capabilities.md` carries a **Real outbox relay** bullet under "Deferred capabilities". Delete
it once activated.

## Step 8 — Verify

```bash
# Generate the migration if you added new outbox-using tables
pnpm --filter @repo/db db:generate
pnpm --filter @repo/db db:migrate

pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
JOBS_ENABLED=true pnpm dev:api

# Trigger a domain mutation:
curl -X POST http://localhost:4000/notes -d '{"title":"hello"}' \
  -H 'content-type: application/json'

# Verify the outbox row landed and was published:
psql "$DATABASE_URL" -c "select id, event_name, published_at, attempt_count from outbox order by created_at desc limit 5;"
```

Within ~1s the row's `published_at` column should populate.

## Common pitfalls

- **Running the worker on every replica** — for in-process workers (Option A), `JOBS_ENABLED=true`
  on multiple replicas means each replica drains the table, which works (the
  `FOR UPDATE SKIP LOCKED` query distributes work) but multiplies the DB query load. Either run the
  worker on exactly one replica (separate workload), or switch to Option B.
- **Missing `FOR UPDATE SKIP LOCKED`** — without it, multiple workers race on the same rows and end
  up double-publishing. The example above includes the clause; do not remove it.
- **Retries forever** — the example marks failed rows with `attemptCount + 1` but never gives up.
  Add a backoff + dead- letter rule (e.g. `WHERE attempt_count < 5`) to stop hammering on
  permanently broken events. The contract carries `attemptCount` so this is a query change, not a
  contract change.
- **Publishing inside the DB transaction** — defeats the purpose. The handler inserts the outbox row
  inside the transaction; the relay publishes outside it.
- **Treating outbox as a queue** — the queue contract (ADR 0007) is for _job execution_ with retry
  budgets. Outbox is for _event publish_ with at-least-once semantics. See ADR 0007's "Distinct from
  outbox" note.

## References

- ADR [0005 — Outbox contract](../adr/0005-outbox-contract.md)
- `apps/api/src/outbox/outbox.module.ts` — wiring
- `packages/db/src/schema/outbox.ts` — Drizzle table
- `packages/contracts/src/outbox.ts` — `OutboxEntry` shape
- `packages/infrastructure/src/outbox.ts` — `OutboxRelay` port + `noopOutboxRelay` +
  `createMemoryOutboxRelay`
- ADR [0007 — Job queue contract](../adr/0007-job-queue-contract.md) — distinct concern
- Pattern reference: <https://microservices.io/patterns/data/transactional-outbox.html>
