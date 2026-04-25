import { expect, test } from "vitest";
import { systemEvents } from "./system-events.js";

test("systemEvents schema exposes the expected columns", () => {
  const columnNames = Object.keys(systemEvents);
  for (const expected of ["id", "eventName", "payload", "occurredAt"]) {
    expect(columnNames).toContain(expected);
  }
});
