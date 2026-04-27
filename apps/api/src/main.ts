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

// Scalar UI for the OpenAPI document. Reads from /openapi.json which is served
// by OpenApiController and generated on the fly from @repo/contracts schemas.
expressApp.use(
  "/docs",
  apiReference({
    url: "/openapi.json",
    pageTitle: `${env.PROJECT_NAME} API`,
  }),
);

await app.listen(env.PORT);

logger.log({
  level: "info",
  message: `API listening on http://localhost:${env.PORT}`,
  details: {
    observability: observability ? "enabled" : "disabled",
    database: dbClient ? "connected" : "not-configured",
    auth: env.AUTH_MODE === "better-auth-embedded" ? (dbClient ? "drizzle" : "memory") : "external",
    jobs: env.JOBS_ENABLED ? "enabled" : "disabled",
    docs: `http://localhost:${env.PORT}/docs`,
  },
});

const shutdown = async (signal: string) => {
  logger.log({ level: "info", message: `Received ${signal}; shutting down.` });
  await app.close();
  if (dbClient) await dbClient.close();
  await observability?.shutdown();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
