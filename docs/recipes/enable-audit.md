# Enable audit recording

The template ships the audit contract (per ADR [0010](../adr/0010-audit-sink-contract.md)) and a
wired `AuditModule` that provides `AUDIT_SINK` defaulting to `noopAuditSink`. The lane is inert
until you (1) swap in a real sink and (2) call `sink.record(...)` from the handlers that generate
forensic events.

This recipe walks through both pieces.

## When this applies

You have a compliance posture that requires "who did what to which resource, with what outcome,
when" — or you've had an incident where reconstructing the event timeline was painful. Common
triggers:

- Compliance regimes (SOC 2, ISO 27001, HIPAA, PCI-DSS, GDPR Article 30).
- Internal-incident response playbooks that need actor-traceable history.
- A vendor / customer SLA that promises an audit trail of admin actions.
- Multi-tenant SaaS where breach scoping requires per-tenant forensic isolation.

If your fork is single-user, internal-only, and has no compliance posture, you can leave
`noopAuditSink` in place — the lane is truly optional.

## Step 1 — Pick a persistence story

| Story                                                       | Trade-off                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Drizzle `audit_events` table                                | One DB. Same backup / restore lifecycle as your data. Lookup is a `SELECT` away. Risk: the DB is the SPOF.                                             |
| SIEM forwarding (Splunk / Datadog / CloudWatch / Honeycomb) | Centralized. Decouples retention from app DB. Adds an external network hop per record.                                                                 |
| Outbox-backed async forwarding                              | Audit row written to outbox in same transaction as the business mutation; relay forwards to the SIEM. Strongest durability story; depends on ADR 0005. |
| Immutable WORM (S3 Object Lock / GCS Bucket Lock)           | Tamper-evident. Required for some compliance regimes. Append-only — no edits, no deletes.                                                              |
| Composite (DB + SIEM)                                       | Write-twice for redundancy. The DB serves operational queries; SIEM serves long-term retention.                                                        |

For most B2B SaaS the right answer is **DB + outbox-backed SIEM forwarding**: the table makes "show
me last week's denied actions for tenant X" a one-line SELECT, and the outbox forwards to a SIEM
asynchronously without blocking the request path.

## Step 2 — Write the sink

For a Drizzle-backed implementation, add a table to `packages/db/src/schema/`:

```ts
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  actorUserId: text("actor_user_id"),
  actorServiceName: text("actor_service_name"),
  actorRoles: jsonb("actor_roles").notNull(),
  tenantId: text("tenant_id"),
  action: text("action").notNull(),
  resourceKind: text("resource_kind"),
  resourceId: text("resource_id"),
  outcome: text("outcome").notNull(), // success / failure / denied
  requestId: text("request_id"),
  correlationId: text("correlation_id"),
  details: jsonb("details"),
});
```

Generate the migration with `pnpm --filter @repo/db db:generate`, then write the sink in
`apps/api/src/audit/drizzle-audit-sink.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import type { AuditEntry, NewAuditEntry } from "@repo/contracts";
import { auditEvents, type DatabaseClient } from "@repo/db";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";
import { DATABASE_CLIENT } from "../db/db.module.js";
import type { AuditSink } from "@repo/infrastructure";

@Injectable()
export class DrizzleAuditSink implements AuditSink {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  record(entry: NewAuditEntry): Effect.Effect<AuditEntry, AppError> {
    return Effect.tryPromise({
      try: async () => {
        const [row] = await this.db.db
          .insert(auditEvents)
          .values({
            actorUserId: entry.actor.userId,
            actorServiceName: entry.actor.serviceName,
            actorRoles: entry.actor.roles,
            tenantId: entry.actor.tenantId,
            action: entry.action,
            resourceKind: entry.resource?.kind,
            resourceId: entry.resource?.id,
            outcome: entry.outcome,
            requestId: entry.requestId,
            correlationId: entry.correlationId,
            details: entry.details,
          })
          .returning();
        return {
          ...entry,
          id: row.id,
          occurredAt: row.occurredAt.toISOString(),
        };
      },
      catch: (cause) => new AppError({ code: "INTERNAL", message: "Audit insert failed.", cause }),
    });
  }
}
```

For the outbox-backed variant, write the sink as an outbox-row insert inside the transaction that
holds the business mutation, and let the relay forward to the SIEM. See ADR
[0005](../adr/0005-outbox-contract.md) for the outbox shape.

## Step 3 — Swap the `AuditModule` provider

Edit `apps/api/src/audit/audit.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { AUDIT_SINK } from "./audit.tokens.js";
import { DrizzleAuditSink } from "./drizzle-audit-sink.js";

@Module({
  imports: [DbModule],
  providers: [
    DrizzleAuditSink,
    {
      provide: AUDIT_SINK,
      useExisting: DrizzleAuditSink,
    },
  ],
  exports: [AUDIT_SINK],
})
export class AuditModule {}
```

`useExisting` aliases the token to the concrete class so DI resolves once.

## Step 4 — Record from handlers

For each forensic-relevant action, inject and call the sink. The canonical sites are:

- **Mutations** (create / update / delete) — record `outcome: "success"` after the DB write commits.
- **Authentication events** (signin success, signin failure, password change, 2FA setup) — record
  `actor: { userId }, action: "auth.signin", outcome: "success" | "failure"`.
- **Denied policy decisions** — pair with [`enable-policy.md`](./enable-policy.md). When
  `evaluator.evaluate` returns `"deny"`, record `outcome: "denied"` before throwing `FORBIDDEN`.
- **Sensitive reads** — data exports, user-list queries from admin surfaces, anything where reading
  itself is a privileged action.

```ts
import { Inject } from "@nestjs/common";
import type { AuditSink } from "@repo/infrastructure";
import { runWorkflow } from "@repo/platform";
import { AUDIT_SINK } from "../audit/audit.tokens.js";

@Controller("/notes")
export class NotesController {
  constructor(
    @Inject(NotesService) private readonly notes: NotesService,
    @Inject(AUDIT_SINK) private readonly audit: AuditSink,
  ) {}

  @Delete(":id")
  @HttpCode(204)
  async delete(@Param("id") id: string, @CurrentUser() user: SessionUser) {
    this.notes.delete(id);
    await runWorkflow(
      this.audit.record({
        actor: { userId: user.id, roles: user.roles ?? [] },
        action: "notes.delete",
        resource: { kind: "notes", id },
        outcome: "success",
      }),
    );
  }
}
```

`requestId` and `correlationId` aren't shown above — they're typically pulled from
`getLoggerContext()`:

```ts
import { getLoggerContext } from "@repo/platform";

const ctx = getLoggerContext();
await runWorkflow(this.audit.record({
  actor: { ... },
  action: "notes.delete",
  resource: { kind: "notes", id },
  outcome: "success",
  requestId: ctx?.requestId,
  correlationId: ctx?.correlationId,
}));
```

## Step 5 — Test against the memory sink

Tests substitute `createMemoryAuditSink` and assert on `sink.entries()`:

```ts
import { createMemoryAuditSink } from "@repo/infrastructure";

const memorySink = createMemoryAuditSink();
const moduleRef = await Test.createTestingModule({
  controllers: [NotesController],
  providers: [NotesService, { provide: AUDIT_SINK, useValue: memorySink }],
}).compile();

test("DELETE /notes/:id records an audit entry", async () => {
  await request(server).delete("/notes/note-1").expect(204);

  const entries = memorySink.entries();
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    action: "notes.delete",
    resource: { kind: "notes", id: "note-1" },
    outcome: "success",
  });
});
```

`memorySink.entries()` returns a snapshot, so concurrent tests can each call `clear()` between
assertions if state needs to reset.

## Step 6 — Update API docs

For routes that now record audit entries, the route doesn't need a schema change but the operational
notes should mention "this route records an audit entry on success / denial". Update the relevant
`docs/api/<resource>.md`.

## Step 7 — Remove the deferred-capabilities entry

`docs/capabilities.md` carries a **Real audit persistence** bullet under "Deferred capabilities".
Delete it once the lane is activated.

## Step 8 — Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm --filter @repo/db db:migrate     # if you added the audit_events table
pnpm --filter @repo/api dev

# Trigger a recorded action:
curl -X DELETE --cookie 'better-auth.session_token=...' \
  https://api.fullstack-typescript-template.localhost/notes/some-id

# Verify the entry landed:
psql "$DATABASE_URL" -c "select * from audit_events order by occurred_at desc limit 1;"
```

## Common pitfalls

- **Recording before the DB write commits** — if the audit sink writes synchronously and the
  business mutation rolls back, the audit row outlives the (non-)action. Either record _after_
  commit (the example above) or use the outbox-backed variant so both writes share the transaction.
- **PII in `details`** — `details` is `Record<string, unknown>`. Forensic relevance ≠ "log the
  entire request body". Strip passwords, tokens, and PII before recording. A future ADR may
  formalize what belongs in `details`; for now, treat it as user-readable.
- **Skipping denied policy decisions** — the most-queried audit filter for compliance review is
  "show me denied actions". If your policy gate throws without recording, the forensic record is
  silent. Pair every `policy.evaluate → "deny"` with an audit `record(...outcome: "denied")` call.
- **Retention policy** — the contract doesn't enforce retention. Decide based on regulatory
  requirement (typically 1-7 years for SOC 2 / HIPAA / PCI). DB-backed implementations need a
  periodic archival job; SIEM-backed implementations inherit the SIEM's retention.
- **Missing `tenantId`** — once multi-tenancy is activated (per
  [`enable-multi-tenancy.md`](./enable-multi-tenancy.md)), `actor.tenantId` is essential for
  per-tenant breach scoping. Pull it from `getTenantContext()` rather than duplicating from business
  state.

## References

- ADR [0010 — Audit sink contract](../adr/0010-audit-sink-contract.md)
- `apps/api/src/audit/audit.module.ts` — wiring
- `packages/contracts/src/audit.ts` — `AuditEntry`, `NewAuditEntry`, `AuditOutcome`
- `packages/infrastructure/src/audit.ts` — `AuditSink` port + `noopAuditSink` +
  `createMemoryAuditSink`
- ADR [0005 — Outbox contract](../adr/0005-outbox-contract.md) — for the outbox-backed durable
  forwarding pattern
- [`enable-policy.md`](./enable-policy.md) — natural pairing
- [`enable-multi-tenancy.md`](./enable-multi-tenancy.md) — for per-tenant audit scoping
