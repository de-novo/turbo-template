import { Module } from "@nestjs/common";
import { type ApiEnv, loadApiEnv } from "@repo/env/apps/api";

export const API_ENV = "API_ENV";

@Module({
  providers: [
    {
      provide: API_ENV,
      useValue: loadApiEnv(),
    },
  ],
  exports: [API_ENV],
})
export class ApiEnvModule {}

export type { ApiEnv };
