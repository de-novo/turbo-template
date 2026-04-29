import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { loadApiEnv } from "@repo/env/apps/api";
import { initOpenTelemetry, type TenantResolver } from "@repo/infrastructure";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module.js";
import type { AuthInstance } from "./auth/auth.js";
import { AUTH_INSTANCE } from "./auth/auth.module.js";
import { DATABASE_CLIENT, type DatabaseClient } from "./db/db.module.js";
import { logger } from "./logger.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { createTenantMiddleware } from "./tenant/tenant.middleware.js";
import { TENANT_RESOLVER } from "./tenant/tenant.tokens.js";

const env = loadApiEnv();

const observability = initOpenTelemetry({
  serviceName: env.PROJECT_SLUG,
  ...(env.OTEL_EXPORTER_OTLP_ENDPOINT ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT } : {}),
  ...(env.OTEL_SERVICE_VERSION ? { serviceVersion: env.OTEL_SERVICE_VERSION } : {}),
});

// CORS: in production, require an explicit allowlist via CORS_ORIGINS (comma-
// separated). In local dev, default to the per-surface portless origins and
// legacy localhost fallbacks so `pnpm dev` and `dev:app` both work without env
// tuning. `cors: true` is intentionally
// avoided — it reflects every Origin and pairs poorly with `credentials: true`.
const defaultDevOrigins = [
  "https://web.fullstack-typescript-template.localhost", // web
  "https://desktop.fullstack-typescript-template.localhost", // desktop
  "https://mfe.fullstack-typescript-template.localhost", // mfe-host
  "https://mfe-dashboard.fullstack-typescript-template.localhost", // mfe-dashboard
  "http://localhost:3000", // web
  "http://localhost:3001", // desktop
  "http://localhost:3100", // mfe-host
  "http://localhost:3101", // mfe-dashboard
];
const corsOrigin =
  env.CORS_ORIGINS && env.CORS_ORIGINS.length > 0
    ? env.CORS_ORIGINS
    : env.APP_ENV === "production"
      ? false
      : defaultDevOrigins;

const app = await NestFactory.create(AppModule, {
  cors: { origin: corsOrigin, credentials: true },
  logger: false,
});

app.use(requestIdMiddleware);
// Tenant middleware runs the configured TenantResolver and, on a non-null
// resolution, wraps the rest of the request in `withTenantContext` +
// `withLoggerContext({ tenantId })`. Default resolver is `noopTenantResolver`
// — solo deploys pay one Effect microtask per request and no scope is opened.
// See ADR 0013 for the wiring rationale and `docs/recipes/enable-multi-tenancy.md`
// for the activation path.
const tenantResolver = app.get<TenantResolver>(TENANT_RESOLVER);
app.use(createTenantMiddleware(tenantResolver));
app.use(requestLoggerMiddleware);

// `DbModule` provides the DatabaseClient (or null when DATABASE_URL is unset)
// and `AuthModule` builds the Better Auth instance from it. Pull both out of
// Nest's DI tree so main.ts owns boot wiring without duplicating construction.
const dbClient = app.get<DatabaseClient | null>(DATABASE_CLIENT, { strict: false });
const authInstance = app.get<AuthInstance | null>(AUTH_INSTANCE, { strict: false });

const expressApp = app.getHttpAdapter().getInstance();

// Mount Better Auth at /api/auth/* via the raw Express adapter so the prefix is
// preserved (express's `app.use(prefix)` strips the mount, breaking Better
// Auth's internal routing). The handler runs before Nest's controllers see the
// request, so Better Auth gets raw bodies.
if (authInstance) {
  expressApp.all("/api/auth/*splat", toNodeHandler(authInstance));
}

await app.listen(env.PORT);

logger.log({
  level: "info",
  message: `API listening on port ${env.PORT}`,
  details: {
    observability: observability ? "enabled" : "disabled",
    database: dbClient ? "connected" : "not-configured",
    auth: env.AUTH_MODE === "better-auth-embedded" ? (dbClient ? "drizzle" : "memory") : "external",
    jobs: env.JOBS_ENABLED ? "enabled" : "disabled",
  },
});

// Graceful shutdown order:
//   1. Stop accepting new connections (httpServer.close()) so probes route to
//      another replica while in-flight requests finish.
//   2. Close the Nest application (lifecycle hooks: jobs, modules, …).
//   3. Drain the DB pool and OTel exporter.
//   4. Force-exit if any of the above hangs past SHUTDOWN_TIMEOUT_MS.
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.log({ level: "info", message: `Received ${signal}; shutting down.` });

  const forceExit = setTimeout(() => {
    logger.log({
      level: "error",
      message: `Shutdown exceeded ${env.SHUTDOWN_TIMEOUT_MS}ms; forcing exit.`,
    });
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    const httpServer = app.getHttpServer() as { close(cb?: (err?: Error) => void): void };
    await new Promise<void>((resolve) => {
      httpServer.close((err) => {
        if (err) {
          logger.log({
            level: "warn",
            message: "httpServer.close error",
            details: { err: String(err) },
          });
        }
        resolve();
      });
    });
    await app.close();
    if (dbClient) await dbClient.close();
    await observability?.shutdown();
    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    logger.log({ level: "error", message: "Shutdown failed", details: { err: String(err) } });
    clearTimeout(forceExit);
    process.exit(1);
  }
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
