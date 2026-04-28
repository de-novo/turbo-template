import type { TenantContext, TenantId } from "@repo/contracts";
import { expect, test } from "vitest";
import { getTenantContext, withTenantContext } from "./tenant-context.js";

const sampleContext: TenantContext = {
  tenantId: "tenant-1" as TenantId,
  tenantSlug: "acme",
};

test("getTenantContext returns undefined outside any tenant scope", () => {
  expect(getTenantContext()).toBeUndefined();
});

test("withTenantContext seeds ALS for the synchronous callback", () => {
  const observed = withTenantContext(sampleContext, () => getTenantContext());
  expect(observed).toEqual(sampleContext);
});

test("withTenantContext propagates across async boundaries", async () => {
  const observed = await withTenantContext(sampleContext, async () => {
    await Promise.resolve();
    return getTenantContext();
  });
  expect(observed).toEqual(sampleContext);
});

test("nested withTenantContext replaces the inner scope only", () => {
  const outer = sampleContext;
  const inner: TenantContext = { tenantId: "tenant-2" as TenantId };

  withTenantContext(outer, () => {
    expect(getTenantContext()).toEqual(outer);
    withTenantContext(inner, () => {
      expect(getTenantContext()).toEqual(inner);
    });
    expect(getTenantContext()).toEqual(outer);
  });
});
