import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createDatabaseClient } from "@repo/db";
import { loadApiEnv } from "@repo/env/apps/api";
import { initOpenTelemetry } from "@repo/infrastructure";
import { toNodeHandler } from "better-auth/node";
import { AppModule } from "./app.module.js";
import { createAuth } from "./auth/auth.js";
import { logger } from "./logger.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";

const env = loadApiEnv();

const observability = initOpenTelemetry({
  serviceName: env.PROJECT_SLUG,
  ...(env.OTEL_EXPORTER_OTLP_ENDPOINT ? { endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT } : {}),
  ...(env.OTEL_SERVICE_VERSION ? { serviceVersion: env.OTEL_SERVICE_VERSION } : {}),
});

const app = await NestFactory.create(AppModule, {
  cors: true,
  logger: false,
});

app.use(requestIdMiddleware);

// Open the database client once at boot when DATABASE_URL is set. The same
// client is passed into Better Auth so sessions persist across restarts; if
// DATABASE_URL is unset, Better Auth falls back to its memory adapter and the
// client stays null. Closed below on shutdown.
const dbClient = env.DATABASE_URL
  ? createDatabaseClient({ connectionString: env.DATABASE_URL })
  : null;

// Mount Better Auth at /api/auth/* via the raw Express adapter so the prefix is
// preserved (express's `app.use(prefix)` strips the mount, breaking Better
// Auth's internal routing). The handler runs before Nest's controllers see the
// request, so Better Auth gets raw bodies.
if (env.AUTH_MODE === "better-auth-embedded") {
  const auth = createAuth(env, dbClient ?? undefined);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all("/api/auth/*splat", toNodeHandler(auth));
}

await app.listen(env.PORT);

logger.log({
  level: "info",
  message: `API listening on http://localhost:${env.PORT}`,
  details: {
    observability: observability ? "enabled" : "disabled",
    database: dbClient ? "connected" : "not-configured",
    auth: env.AUTH_MODE === "better-auth-embedded" ? (dbClient ? "drizzle" : "memory") : "external",
  },
});

const shutdown = async (signal: string) => {
  logger.log({ level: "info", message: `Received ${signal}; shutting down.` });
  await app.close();
  await dbClient?.close();
  await observability?.shutdown();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
