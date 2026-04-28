import { expect, test } from "vitest";
import { auditEntrySchema, auditOutcomeSchema, newAuditEntrySchema } from "./audit.js";

test("auditOutcomeSchema accepts success / failure / denied", () => {
  expect(auditOutcomeSchema.safeParse("success").success).toBe(true);
  expect(auditOutcomeSchema.safeParse("failure").success).toBe(true);
  expect(auditOutcomeSchema.safeParse("denied").success).toBe(true);
});

test("auditOutcomeSchema rejects unknown outcomes", () => {
  expect(auditOutcomeSchema.safeParse("pending").success).toBe(false);
});

test("auditEntrySchema validates a user-initiated action with a resource", () => {
  const result = auditEntrySchema.safeParse({
    id: "evt-1",
    occurredAt: "2026-04-28T00:00:00.000Z",
    actor: { userId: "u-1", roles: ["admin"], tenantId: "tenant-1" },
    action: "notes.delete",
    resource: { kind: "notes", id: "note-7" },
    outcome: "success",
    requestId: "req-abc",
  });
  expect(result.success).toBe(true);
});

test("auditEntrySchema validates a service-initiated action with no resource", () => {
  const result = auditEntrySchema.safeParse({
    id: "evt-2",
    occurredAt: "2026-04-28T00:00:00.000Z",
    actor: { serviceName: "jobs-runner" },
    action: "jobs.heartbeat",
    outcome: "success",
  });
  expect(result.success).toBe(true);
});

test("auditEntrySchema validates a denied policy decision", () => {
  const result = auditEntrySchema.safeParse({
    id: "evt-3",
    occurredAt: "2026-04-28T00:00:00.000Z",
    actor: { userId: "u-2", roles: ["viewer"] },
    action: "notes.write",
    resource: { kind: "notes", id: "note-7" },
    outcome: "denied",
    details: { policyRule: "owner-only" },
  });
  expect(result.success).toBe(true);
});

test("newAuditEntrySchema rejects auto-managed fields silently by ignoring them", () => {
  const parsed = newAuditEntrySchema.parse({
    actor: { userId: "u-1" },
    action: "notes.create",
    outcome: "success",
  });
  expect(parsed).not.toHaveProperty("id");
  expect(parsed).not.toHaveProperty("occurredAt");
});

test("auditEntrySchema rejects missing required fields", () => {
  const result = auditEntrySchema.safeParse({
    id: "evt-4",
    occurredAt: "2026-04-28T00:00:00.000Z",
    actor: { userId: "u-1" },
    outcome: "success",
  });
  expect(result.success).toBe(false);
});
