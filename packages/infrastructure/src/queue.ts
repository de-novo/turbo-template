import type { JobDescriptor, JobRecord } from "@repo/contracts";
import { AppError } from "@repo/platform";
import type { AppError as AppErrorType } from "@repo/platform";
import { Effect } from "effect";

/**
 * Demand-driven job queue port. Workers `claimNext` to receive a job (or
 * `null` if nothing is ready), then `ack` on success or `nack` on failure
 * with a reason. The queue handles attempt accounting and the
 * `scheduledFor` clock; `nack` past `maxAttempts` flips the job to
 * `failed`.
 *
 * Real adapters (BullMQ, Inngest, SQS, Cloud Tasks) implement this port.
 * The memory adapter is sufficient for tests and small in-process work.
 * `noopJobQueue` accepts enqueue silently and never produces work — fine
 * for solo deploys that haven't activated the lane. See ADR
 * docs/adr/0007-job-queue-contract.md.
 */
export type JobQueue = {
  enqueue(descriptor: JobDescriptor): Effect.Effect<JobRecord, AppErrorType>;
  claimNext(now?: Date): Effect.Effect<JobRecord | null, AppErrorType>;
  ack(id: string): Effect.Effect<void, AppErrorType>;
  nack(id: string, reason: string): Effect.Effect<void, AppErrorType>;
  sizeByStatus(): Effect.Effect<Record<JobRecord["status"], number>, AppErrorType>;
};

const emptySizes = (): Record<JobRecord["status"], number> => ({
  pending: 0,
  running: 0,
  succeeded: 0,
  failed: 0,
});

const missingJob = (id: string) =>
  new AppError({ code: "NOT_FOUND", message: `Job ${id} not found.` });

export const noopJobQueue: JobQueue = {
  enqueue: (descriptor) =>
    Effect.succeed({
      ...descriptor,
      maxAttempts: descriptor.maxAttempts ?? 3,
      id: "noop",
      status: "pending",
      attempt: 1,
      enqueuedAt: new Date().toISOString(),
    }),
  claimNext: () => Effect.succeed(null),
  ack: () => Effect.void,
  nack: () => Effect.void,
  sizeByStatus: () => Effect.succeed(emptySizes()),
};

export function createMemoryJobQueue(): JobQueue {
  const records = new Map<string, JobRecord>();
  const seenIdempotencyKeys = new Map<string, string>();
  let nextId = 0;

  const newId = () => `job_${++nextId}`;

  return {
    enqueue: (descriptor) =>
      Effect.sync(() => {
        if (descriptor.idempotencyKey) {
          const existingId = seenIdempotencyKeys.get(descriptor.idempotencyKey);
          if (existingId) {
            const existing = records.get(existingId);
            if (existing) return existing;
          }
        }
        const id = newId();
        const record: JobRecord = {
          name: descriptor.name,
          payload: descriptor.payload,
          maxAttempts: descriptor.maxAttempts ?? 3,
          ...(descriptor.idempotencyKey ? { idempotencyKey: descriptor.idempotencyKey } : {}),
          ...(descriptor.scheduledFor ? { scheduledFor: descriptor.scheduledFor } : {}),
          ...(descriptor.tenantId ? { tenantId: descriptor.tenantId } : {}),
          id,
          status: "pending",
          attempt: 1,
          enqueuedAt: new Date().toISOString(),
        };
        records.set(id, record);
        if (descriptor.idempotencyKey) {
          seenIdempotencyKeys.set(descriptor.idempotencyKey, id);
        }
        return record;
      }),
    claimNext: (now = new Date()) =>
      Effect.sync(() => {
        const ready = [...records.values()]
          .filter(
            (r) =>
              r.status === "pending" &&
              (r.scheduledFor === undefined || r.scheduledFor <= now.toISOString()),
          )
          .sort((a, b) => a.enqueuedAt.localeCompare(b.enqueuedAt));
        const claimed = ready[0];
        if (!claimed) return null;
        const next: JobRecord = { ...claimed, status: "running" };
        records.set(claimed.id, next);
        return next;
      }),
    ack: (id) =>
      Effect.suspend(() => {
        const record = records.get(id);
        if (!record) {
          return Effect.fail(missingJob(id));
        }
        return Effect.sync(() => {
          records.set(id, { ...record, status: "succeeded" });
        });
      }),
    nack: (id, reason) =>
      Effect.suspend(() => {
        const record = records.get(id);
        if (!record) {
          return Effect.fail(missingJob(id));
        }
        return Effect.sync(() => {
          const exhausted = record.attempt >= record.maxAttempts;
          records.set(id, {
            ...record,
            status: exhausted ? "failed" : "pending",
            attempt: exhausted ? record.attempt : record.attempt + 1,
            lastError: reason,
          });
        });
      }),
    sizeByStatus: () =>
      Effect.sync(() => {
        const sizes = emptySizes();
        for (const record of records.values()) {
          sizes[record.status] += 1;
        }
        return sizes;
      }),
  };
}
