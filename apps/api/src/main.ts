import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const port = Number(process.env.PORT ?? 4000);

const app = await NestFactory.create(AppModule, {
  cors: true,
});

await app.listen(port);

console.log(`API listening on http://localhost:${port}`);
