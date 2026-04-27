import { Module } from "@nestjs/common";
import { ApiEnvModule } from "../api-env.module.js";
import { DbModule } from "../db/db.module.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [ApiEnvModule, DbModule],
  controllers: [HealthController],
})
export class HealthModule {}
