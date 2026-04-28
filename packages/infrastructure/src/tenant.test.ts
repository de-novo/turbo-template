import { Effect } from "effect";
import { expect, test } from "vitest";
import { noopTenantResolver } from "./tenant.js";

test("noopTenantResolver returns null for any request", async () => {
  const value = await Effect.runPromise(noopTenantResolver.resolveTenant({}));
  expect(value).toBeNull();
});

test("noopTenantResolver ignores request shape", async () => {
  const value = await Effect.runPromise(
    noopTenantResolver.resolveTenant({ headers: { "x-tenant-id": "tenant-1" } }),
  );
  expect(value).toBeNull();
});
