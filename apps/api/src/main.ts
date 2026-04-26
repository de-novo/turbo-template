import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
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

// Mount Better Auth at /api/auth/* via the raw Express adapter so the prefix is
// preserved (express's `app.use(prefix)` strips the mount, breaking Better
// Auth's internal routing). The handler runs before Nest's controllers see the
// request, so Better Auth gets raw bodies. The shipped configuration uses an
// in-process memory adapter (see apps/api/src/auth/auth.ts); production swaps
// to the Drizzle adapter.
if (env.AUTH_MODE === "better-auth-embedded") {
  const auth = createAuth(env);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all("/api/auth/*splat", toNodeHandler(auth));
}

await app.listen(env.PORT);

logger.log({
  level: "info",
  message: `API listening on http://localhost:${env.PORT}`,
  details: {
    observability: observability ? "enabled" : "disabled",
  },
});

const shutdown = async (signal: string) => {
  logger.log({ level: "info", message: `Received ${signal}; shutting down.` });
  await app.close();
  await observability?.shutdown();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
