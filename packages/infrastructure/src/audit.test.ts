import type { NewAuditEntry } from "@repo/contracts";
import { Effect } from "effect";
import { expect, test } from "vitest";
import { createMemoryAuditSink, noopAuditSink } from "./audit.js";

const sample: NewAuditEntry = {
  actor: { userId: "u-1", roles: ["admin"], tenantId: "tenant-1" },
  action: "notes.delete",
  resource: { kind: "notes", id: "note-7" },
  outcome: "success",
};

test("noopAuditSink stamps id+occurredAt without recording", async () => {
  const persisted = await Effect.runPromise(noopAuditSink.record(sample));
  expect(persisted.id).toBe("noop");
  expect(persisted.action).toBe("notes.delete");
});

test("memory sink stamps a unique id + occurredAt and stores the entry", async () => {
  const sink = createMemoryAuditSink();
  const first = await Effect.runPromise(sink.record(sample));
  const second = await Effect.runPromise(sink.record({ ...sample, action: "notes.create" }));

  expect(first.id).toBe("audit_1");
  expect(second.id).toBe("audit_2");
  expect(first.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const entries = sink.entries();
  expect(entries).toHaveLength(2);
  expect(entries[0]?.action).toBe("notes.delete");
  expect(entries[1]?.action).toBe("notes.create");
});

test("memory sink preserves the actor + tenant + outcome fields verbatim", async () => {
  const sink = createMemoryAuditSink();
  await Effect.runPromise(
    sink.record({
      actor: { serviceName: "jobs-runner" },
      action: "jobs.tick",
      outcome: "success",
    }),
  );

  const [entry] = sink.entries();
  expect(entry?.actor.serviceName).toBe("jobs-runner");
  expect(entry?.outcome).toBe("success");
  expect(entry?.resource).toBeUndefined();
});

test("memory sink supports a denied-decision audit shape", async () => {
  const sink = createMemoryAuditSink();
  await Effect.runPromise(
    sink.record({
      actor: { userId: "u-2", roles: ["viewer"] },
      action: "notes.write",
      resource: { kind: "notes", id: "note-7" },
      outcome: "denied",
      details: { policyRule: "owner-only" },
    }),
  );

  const [entry] = sink.entries();
  expect(entry?.outcome).toBe("denied");
  expect(entry?.details?.["policyRule"]).toBe("owner-only");
});

test("clear empties the recorded entries", async () => {
  const sink = createMemoryAuditSink();
  await Effect.runPromise(sink.record(sample));
  expect(sink.entries()).toHaveLength(1);

  sink.clear();
  expect(sink.entries()).toEqual([]);
});

test("entries() returns a snapshot, not a live reference", async () => {
  const sink = createMemoryAuditSink();
  await Effect.runPromise(sink.record(sample));

  const snapshot = sink.entries();
  await Effect.runPromise(sink.record({ ...sample, action: "notes.create" }));

  expect(snapshot).toHaveLength(1);
});
