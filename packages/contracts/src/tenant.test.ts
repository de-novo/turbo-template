import { expect, test } from "vitest";
import { tenantContextSchema, tenantHeaderName, tenantIdSchema } from "./tenant.js";

test("tenantIdSchema accepts non-empty ids", () => {
  expect(tenantIdSchema.safeParse("tenant-abc").success).toBe(true);
});

test("tenantIdSchema rejects empty ids", () => {
  expect(tenantIdSchema.safeParse("").success).toBe(false);
});

test("tenantContextSchema validates id-only context", () => {
  const result = tenantContextSchema.safeParse({ tenantId: "t-1" });
  expect(result.success).toBe(true);
});

test("tenantContextSchema accepts an optional slug", () => {
  const result = tenantContextSchema.safeParse({ tenantId: "t-1", tenantSlug: "acme" });
  expect(result.success).toBe(true);
});

test("tenantContextSchema rejects malformed slugs", () => {
  const result = tenantContextSchema.safeParse({ tenantId: "t-1", tenantSlug: "Bad Slug" });
  expect(result.success).toBe(false);
});

test("tenantHeaderName is the conventional x-tenant-id header", () => {
  expect(tenantHeaderName).toBe("x-tenant-id");
});
