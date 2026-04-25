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
