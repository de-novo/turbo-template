import type { TenantContext, TenantId } from "@repo/contracts";
import type { TenantResolver } from "@repo/infrastructure";
import { noopTenantResolver } from "@repo/infrastructure";
import { AppError, getLoggerContext, getTenantContext, withLoggerContext } from "@repo/platform";
import { Effect } from "effect";
import type { NextFunction, Request, Response } from "express";
import { expect, test } from "vitest";
import { createTenantMiddleware } from "./tenant.middleware.js";

const fakeReq = (headers: Record<string, string> = {}) =>
  ({ headers, path: "/", method: "GET" }) as unknown as Request;
const fakeRes = () => ({}) as Response;

const runMiddleware = (
  resolver: TenantResolver,
  req: Request = fakeReq(),
  observeNext?: () => void,
) =>
  new Promise<{ tenant: TenantContext | undefined; loggerTenantId?: string; error?: unknown }>(
    (resolve) => {
      const middleware = createTenantMiddleware(resolver);
      const next: NextFunction = (err?: unknown) => {
        if (err) {
          resolve({ tenant: undefined, error: err });
          return;
        }
        observeNext?.();
        const tenant = getTenantContext();
        const loggerCtx = getLoggerContext();
        resolve({
          tenant,
          ...(loggerCtx?.tenantId ? { loggerTenantId: loggerCtx.tenantId } : {}),
        });
      };
      middleware(req, fakeRes(), next);
    },
  );

test("noop resolver leaves tenant context unset and never seeds a logger field", async () => {
  const result = await runMiddleware(noopTenantResolver);
  expect(result.tenant).toBeUndefined();
  expect(result.loggerTenantId).toBeUndefined();
  expect(result.error).toBeUndefined();
});

test("resolver returning a TenantContext seeds withTenantContext and LoggerContext.tenantId", async () => {
  const tenant: TenantContext = {
    tenantId: "tenant-1" as TenantId,
    tenantSlug: "acme",
  };
  const resolver: TenantResolver = {
    resolveTenant: () => Effect.succeed(tenant),
  };

  const result = await runMiddleware(resolver);
  expect(result.tenant).toEqual(tenant);
  expect(result.loggerTenantId).toBe("tenant-1");
});

test("resolver failing with AppError forwards to next(err)", async () => {
  const failure = new AppError({ code: "UNAUTHORIZED", message: "Tenant lookup denied." });
  const resolver: TenantResolver = {
    resolveTenant: () => Effect.fail(failure),
  };

  const result = await runMiddleware(resolver);
  expect(result.error).toBe(failure);
  expect(result.tenant).toBeUndefined();
});

test("tenant scope nests under an existing logger context (request id stays visible)", async () => {
  const tenant: TenantContext = { tenantId: "tenant-1" as TenantId };
  const resolver: TenantResolver = {
    resolveTenant: () => Effect.succeed(tenant),
  };

  const observed = await new Promise<{ requestId?: string; tenantId?: string }>((resolve) => {
    withLoggerContext({ requestId: "req-1" }, () => {
      const middleware = createTenantMiddleware(resolver);
      middleware(fakeReq(), fakeRes(), () => {
        const ctx = getLoggerContext();
        resolve({
          ...(ctx?.requestId ? { requestId: ctx.requestId } : {}),
          ...(ctx?.tenantId ? { tenantId: ctx.tenantId } : {}),
        });
      });
    });
  });

  expect(observed.requestId).toBe("req-1");
  expect(observed.tenantId).toBe("tenant-1");
});
