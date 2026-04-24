export type LogLevel = "debug" | "info" | "warn" | "error";

export type LoggerContext = {
  requestId?: string;
  correlationId?: string;
  userId?: string;
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

const outputByLevel = {
  debug: process.stdout,
  info: process.stdout,
  warn: process.stderr,
  error: process.stderr,
} satisfies Record<LogLevel, NodeJS.WriteStream>;

export const consoleLogger: Logger = {
  log(event) {
    const { level, message, ...context } = event;
    outputByLevel[level].write(`${JSON.stringify({ level, message, ...context })}\n`);
  },
};
