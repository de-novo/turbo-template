import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { loadApiEnv } from "@repo/env/apps/api";
import { initOpenTelemetry } from "@repo/infrastructure";
import { AppModule } from "./app.module.js";
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
