import { Controller, Get, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { API_ENV, type ApiEnv } from "../api-env.module.js";
import { buildOpenApiDocument } from "./openapi.config.js";

/**
 * Serves /openapi.json — generated on the fly from @repo/contracts schemas.
 * The Scalar docs UI at /docs (mounted in main.ts via raw Express) reads from
 * this endpoint, so the two stay in sync without a build-time codegen step.
 */
@SkipThrottle()
@Controller("/openapi.json")
export class OpenApiController {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  @Get()
  document(): unknown {
    return buildOpenApiDocument(this.env);
  }
}
