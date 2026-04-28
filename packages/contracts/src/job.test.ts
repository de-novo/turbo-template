import { expect, test } from "vitest";
import { jobDescriptorSchema, jobRecordSchema, jobStatusSchema } from "./job.js";

test("jobStatusSchema accepts the four lifecycle states", () => {
  for (const status of ["pending", "running", "succeeded", "failed"]) {
    expect(jobStatusSchema.safeParse(status).success).toBe(true);
  }
});

test("jobStatusSchema rejects unknown states", () => {
  expect(jobStatusSchema.safeParse("paused").success).toBe(false);
});

test("jobDescriptorSchema requires only name + payload, applies maxAttempts default", () => {
  const result = jobDescriptorSchema.parse({
    name: "notes.image.resize",
    payload: { id: "img-1" },
  });
  expect(result.maxAttempts).toBe(3);
  expect(result.idempotencyKey).toBeUndefined();
});

test("jobDescriptorSchema accepts a scheduled tenanted job", () => {
  const result = jobDescriptorSchema.safeParse({
    name: "user.welcome.email",
    payload: { userId: "u-1" },
    idempotencyKey: "user.welcome.email/u-1",
    scheduledFor: "2026-04-29T00:00:00.000Z",
    maxAttempts: 5,
    tenantId: "tenant-1",
  });
  expect(result.success).toBe(true);
});

test("jobRecordSchema requires the runtime fields the descriptor lacks", () => {
  const result = jobRecordSchema.safeParse({
    name: "notes.image.resize",
    payload: {},
    id: "job-1",
    status: "pending",
    attempt: 1,
    enqueuedAt: "2026-04-28T00:00:00.000Z",
  });
  expect(result.success).toBe(true);
});

test("jobRecordSchema rejects a record missing status", () => {
  const result = jobRecordSchema.safeParse({
    name: "notes.image.resize",
    payload: {},
    id: "job-1",
    attempt: 1,
    enqueuedAt: "2026-04-28T00:00:00.000Z",
  });
  expect(result.success).toBe(false);
});
