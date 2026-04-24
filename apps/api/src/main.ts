import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { loadApiEnv } from "@repo/env/apps/api";
import { AppModule } from "./app.module.js";

const env = loadApiEnv();
const logger = new Logger("Bootstrap");

const app = await NestFactory.create(AppModule, {
  cors: true,
});

await app.listen(env.PORT);

logger.log(`API listening on http://localhost:${env.PORT}`);
