import { Module } from "@nestjs/common";
import { ApiEnvModule } from "../api-env.module.js";
import { OpenApiController } from "./openapi.controller.js";

@Module({
  imports: [ApiEnvModule],
  controllers: [OpenApiController],
})
export class OpenApiModule {}
