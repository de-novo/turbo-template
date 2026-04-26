import { Controller, Get, Header } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { collectDefaultMetrics, register } from "prom-client";

collectDefaultMetrics();

@SkipThrottle()
@Controller("/metrics")
export class MetricsController {
  @Get()
  @Header("content-type", register.contentType)
  metrics(): Promise<string> {
    return register.metrics();
  }
}
