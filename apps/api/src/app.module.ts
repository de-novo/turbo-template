import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ApiEnvModule } from "./api-env.module.js";
import { AppController } from "./app.controller.js";
import { AppErrorFilter } from "./filters/app-error.filter.js";

@Module({
  imports: [ApiEnvModule],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppErrorFilter,
    },
  ],
})
export class AppModule {}
