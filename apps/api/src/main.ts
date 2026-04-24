import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const port = Number(process.env["PORT"] ?? 4000);
const logger = new Logger("Bootstrap");

const app = await NestFactory.create(AppModule, {
  cors: true,
});

await app.listen(port);

logger.log(`API listening on http://localhost:${port}`);
