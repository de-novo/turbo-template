import { loadApiEnv } from "@repo/env/apps/api";
import { createPinoLogger, type Logger } from "@repo/platform";

const env = loadApiEnv();

export const logger: Logger = createPinoLogger({
  level: env.LOG_LEVEL,
  serviceName: env.PROJECT_SLUG,
});
