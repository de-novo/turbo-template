import { expect, test } from "vitest";
import { outbox } from "./outbox.js";

test("outbox schema exposes the expected columns", () => {
  const columnNames = Object.keys(outbox);
  for (const expected of [
    "id",
    "topic",
    "eventName",
    "eventVersion",
    "payload",
    "metadata",
    "tenantId",
    "createdAt",
    "publishedAt",
    "lastError",
    "attemptCount",
  ]) {
    expect(columnNames).toContain(expected);
  }
});
