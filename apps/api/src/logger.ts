import { loadApiEnv } from "@repo/env/apps/api";
import { createPinoLogger, type Logger } from "@repo/platform";

const env = loadApiEnv();

// The API always emits structured JSON to stdout. In dev, the `dev` script
// pipes stdout through `pino-pretty` for human-readable colorized output;
// production deploys (`node dist/main.js`) keep the JSON intact for log
// shippers (Loki, Datadog, …) to parse.
export const logger: Logger = createPinoLogger({
  level: env.LOG_LEVEL,
  serviceName: env.PROJECT_SLUG,
});
