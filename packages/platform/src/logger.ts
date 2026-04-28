import { AsyncLocalStorage } from "node:async_hooks";
import { pino } from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerContext = {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  serviceName?: string;
};

export type LogEvent = LoggerContext & {
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
};

export type Logger = {
  log(event: LogEvent): void;
};

export type LoggerOptions = {
  level?: LogLevel;
  serviceName?: string;
  destination?: NodeJS.WritableStream;
};

const loggerContextStorage = new AsyncLocalStorage<LoggerContext>();

export function withLoggerContext<T>(context: LoggerContext, fn: () => T): T {
  const merged = { ...loggerContextStorage.getStore(), ...context };
  return loggerContextStorage.run(merged, fn);
}

export function getLoggerContext(): LoggerContext | undefined {
  return loggerContextStorage.getStore();
}

export function createPinoLogger(options: LoggerOptions = {}): Logger {
  const base = options.serviceName ? { serviceName: options.serviceName } : undefined;
  const pinoInstance = pino(
    {
      level: options.level ?? "info",
      base: base ?? null,
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    options.destination,
  );

  return {
    log(event) {
      const ambient = loggerContextStorage.getStore() ?? {};
      const { level, message, details, ...explicit } = event;
      const payload = {
        ...ambient,
        ...explicit,
        ...(details ?? {}),
      };
      pinoInstance[level](payload, message);
    },
  };
}

export const noopLogger: Logger = {
  log: () => undefined,
};
