import { Module } from "@nestjs/common";
import { ApiEnvModule } from "../api-env.module.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [ApiEnvModule],
  controllers: [HealthController],
})
export class HealthModule {}
