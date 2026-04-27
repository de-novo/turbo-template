import { Controller, Get, Header } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { register } from "prom-client";
// Side-effect import: registers the default Node.js metrics + the HTTP request
// histogram + counter on the prom-client singleton register.
import "./http-metrics.js";

@SkipThrottle()
@Controller("/metrics")
export class MetricsController {
  @Get()
  @Header("content-type", register.contentType)
  metrics(): Promise<string> {
    return register.metrics();
  }
}
