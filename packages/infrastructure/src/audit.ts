import type { AuditEntry, NewAuditEntry } from "@repo/contracts";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";

/**
 * Audit-event sink port. Consumers call `record(entry)` whenever a
 * forensic-relevant action occurs (signin, permission grant, data
 * export, denied policy decision); the sink stamps `id` + `occurredAt`
 * and returns the persisted entry.
 *
 * `noopAuditSink` swallows entries silently — fine for solo deploys
 * with no compliance requirement. `createMemoryAuditSink` records to
 * an internal list and exposes `entries()` for tests
 * (`expect(sink.entries()).toContainEqual(...)`).
 *
 * Real persistence — DB-backed `audit_events` table, SIEM forwarding to
 * Splunk / Datadog / CloudWatch / Honeycomb, immutable WORM storage,
 * S3 + Object Lock — plugs in by implementing `AuditSink`. The audit
 * lane often rides the outbox (ADR 0005) for durable async forwarding
 * rather than blocking the request path. See ADR
 * docs/adr/0010-audit-sink-contract.md.
 */
export type AuditSink = {
  record(entry: NewAuditEntry): Effect.Effect<AuditEntry, AppError>;
};

export const noopAuditSink: AuditSink = {
  record: (entry) =>
    Effect.succeed({
      ...entry,
      id: "noop",
      occurredAt: new Date().toISOString(),
    }),
};

export type MemoryAuditSink = AuditSink & {
  entries(): AuditEntry[];
  clear(): void;
};

export function createMemoryAuditSink(): MemoryAuditSink {
  const stored: AuditEntry[] = [];
  let nextId = 0;

  return {
    record: (entry) =>
      Effect.sync(() => {
        const persisted: AuditEntry = {
          ...entry,
          id: `audit_${++nextId}`,
          occurredAt: new Date().toISOString(),
        };
        stored.push(persisted);
        return persisted;
      }),
    entries: () => stored.slice(),
    clear: () => {
      stored.length = 0;
    },
  };
}
