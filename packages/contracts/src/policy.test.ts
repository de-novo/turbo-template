import { expect, test } from "vitest";
import { policyDecisionSchema, policyQuerySchema } from "./policy.js";

test("policyDecisionSchema accepts allow and deny", () => {
  expect(policyDecisionSchema.safeParse("allow").success).toBe(true);
  expect(policyDecisionSchema.safeParse("deny").success).toBe(true);
});

test("policyDecisionSchema rejects abstain or other values", () => {
  expect(policyDecisionSchema.safeParse("abstain").success).toBe(false);
});

test("policyQuerySchema validates a minimal subject + action + resource", () => {
  const result = policyQuerySchema.safeParse({
    subject: { userId: "u-1" },
    action: "notes:read",
    resource: { kind: "notes" },
  });
  expect(result.success).toBe(true);
});

test("policyQuerySchema validates a fully populated ABAC query", () => {
  const result = policyQuerySchema.safeParse({
    subject: {
      userId: "u-1",
      roles: ["admin"],
      tenantId: "tenant-1",
      attributes: { team: "platform" },
    },
    action: "notes:write",
    resource: {
      kind: "notes",
      id: "note-42",
      attributes: { ownerId: "u-1", status: "draft" },
    },
    context: { ip: "10.0.0.1" },
  });
  expect(result.success).toBe(true);
});

test("policyQuerySchema rejects missing required fields", () => {
  const result = policyQuerySchema.safeParse({
    subject: { userId: "u-1" },
    action: "notes:read",
  });
  expect(result.success).toBe(false);
});
