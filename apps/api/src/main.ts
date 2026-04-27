import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { loadApiEnv } from "@repo/env/apps/api";
import { initOpenTelemetry } from "@repo/infrastructure";
import { apiReference } from "@scalar/express-api-reference";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module.js";
import type { AuthInstance } from "./auth/auth.js";
import { AUTH_INSTANCE } from "./auth/auth.module.js";
import { DATABASE_CLIENT, type DatabaseClient } from "./db/db.module.js";
import { logger } from "./logger.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";

const env = loadApiEnv();

const observability = initOpenTelemetry({
  serviceName: env.PROJECT_SLUG,
  ...(env.OTEL_EXPORTER_OTLP_ENDPOINT ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT } : {}),
  ...(env.OTEL_SERVICE_VERSION ? { serviceVersion: env.OTEL_SERVICE_VERSION } : {}),
});

// CORS: in production, require an explicit allowlist via CORS_ORIGINS (comma-
// separated). In local dev, default to the per-surface localhost origins so
// `pnpm dev` "just works" without env tuning. `cors: true` is intentionally
// avoided — it reflects every Origin and pairs poorly with `credentials: true`.
const defaultDevOrigins = [
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

// Scalar UI for the OpenAPI document. Mounted only when EXPOSE_DOCS=true (the
// default in dev). Production deploys typically set EXPOSE_DOCS=false to avoid
// publishing the API surface; OpenApiController guards `/openapi.json` with the
// same flag so the doc and the renderer stay in sync.
if (env.EXPOSE_DOCS) {
  expressApp.use(
    "/docs",
    apiReference({
      url: "/openapi.json",
      pageTitle: `${env.PROJECT_NAME} API`,
    }),
  );
}

await app.listen(env.PORT);

logger.log({
  level: "info",
  message: `API listening on http://localhost:${env.PORT}`,
  details: {
    observability: observability ? "enabled" : "disabled",
    database: dbClient ? "connected" : "not-configured",
    auth: env.AUTH_MODE === "better-auth-embedded" ? (dbClient ? "drizzle" : "memory") : "external",
    jobs: env.JOBS_ENABLED ? "enabled" : "disabled",
    docs: env.EXPOSE_DOCS ? `http://localhost:${env.PORT}/docs` : "disabled",
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
