import type { NewOutboxEntry, OutboxEntry } from "@repo/contracts";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";

/**
 * Relay-side port over the transactional outbox table. The relay process
 * (one per deploy, typically) calls `claimBatch` on a tick, hands the
 * entries to whatever publisher the consumer wired in (Kafka, SNS, HTTP
 * webhook), and reports per-entry outcome via `markPublished` / `markFailed`.
 *
 * `enqueue` is intentionally **not** on this port: outbox writes happen
 * inside the application's existing DB transaction (alongside the business
 * mutation), not through this port. The memory adapter exposes
 * `enqueue`/`pendingCount` only for testing the relay loop in isolation.
 *
 * Default: `noopOutboxRelay` returns empty claims and accepts mark calls
 * silently — fine for solo deploys that haven't activated the lane. See
 * ADR docs/adr/0005-outbox-contract.md.
 */
export type OutboxRelay = {
  claimBatch(limit: number): Effect.Effect<OutboxEntry[], AppError>;
  markPublished(ids: ReadonlyArray<string>): Effect.Effect<void, AppError>;
  markFailed(id: string, reason: string): Effect.Effect<void, AppError>;
};

export const noopOutboxRelay: OutboxRelay = {
  claimBatch: () => Effect.succeed([]),
  markPublished: () => Effect.void,
  markFailed: () => Effect.void,
};

export type MemoryOutboxRelay = OutboxRelay & {
  enqueue(entry: NewOutboxEntry): Effect.Effect<OutboxEntry, AppError>;
  pendingCount(): Effect.Effect<number, AppError>;
};

export function createMemoryOutboxRelay(): MemoryOutboxRelay {
  const rows = new Map<string, OutboxEntry>();
  let nextId = 0;

  return {
    enqueue: (entry) =>
      Effect.sync(() => {
        const id = `outbox_${++nextId}`;
        const row: OutboxEntry = {
          id,
          topic: entry.topic,
          eventName: entry.eventName,
          eventVersion: entry.eventVersion ?? "1",
          payload: entry.payload,
          metadata: entry.metadata,
          ...(entry.tenantId !== undefined ? { tenantId: entry.tenantId } : {}),
          createdAt: new Date().toISOString(),
          attemptCount: 0,
        };
        rows.set(id, row);
        return row;
      }),
    claimBatch: (limit) =>
      Effect.sync(() => {
        const pending = [...rows.values()]
          .filter((row) => row.publishedAt === undefined)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
          .slice(0, limit);
        return pending;
      }),
    markPublished: (ids) =>
      Effect.sync(() => {
        const stamp = new Date().toISOString();
        for (const id of ids) {
          const row = rows.get(id);
          if (row) {
            rows.set(id, { ...row, publishedAt: stamp });
          }
        }
      }),
    markFailed: (id, reason) =>
      Effect.sync(() => {
        const row = rows.get(id);
        if (row) {
          rows.set(id, {
            ...row,
            attemptCount: row.attemptCount + 1,
            lastError: reason,
          });
        }
      }),
    pendingCount: () =>
      Effect.sync(() => [...rows.values()].filter((row) => row.publishedAt === undefined).length),
  };
}
