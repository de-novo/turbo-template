import {
	type Logger as PinoInstance,
	type LoggerOptions as PinoOptions,
	pino,
} from "pino";
import type { LogEvent, Logger } from "./logger.js";

export type CreatePinoLoggerOptions = {
	/** Human-readable service name stamped on every log line. */
	serviceName: string;
	/** Pino level. Defaults to "info" in production, "debug" elsewhere. */
	level?: PinoOptions["level"];
	/** When true, use pino-pretty for human output. Defaults to NODE_ENV !== "production". */
	pretty?: boolean;
	/** Extra redact paths on top of the defaults. */
	redact?: string[];
};

const DEFAULT_REDACT = [
	"req.headers.authorization",
	"req.headers.cookie",
	"req.headers['set-cookie']",
	"res.headers['set-cookie']",
	"password",
];

/**
 * Build a Pino instance and a matching `Logger` adapter that conforms to the
 * platform `Logger` contract. Use the returned `pino` instance when you need
 * the full Pino API (e.g. with `nestjs-pino`) and `logger` when you want to
 * stay framework-agnostic.
 */
export function createPinoLogger(options: CreatePinoLoggerOptions): {
	pino: PinoInstance;
	logger: Logger;
} {
	const isProd = process.env["NODE_ENV"] === "production";
	const pretty = options.pretty ?? !isProd;

	const redact = [...DEFAULT_REDACT, ...(options.redact ?? [])];

	const pinoOptions: PinoOptions = {
		level: options.level ?? (isProd ? "info" : "debug"),
		base: { service: options.serviceName },
		redact: { paths: redact, censor: "[redacted]" },
		...(pretty
			? {
					transport: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "SYS:HH:MM:ss.l",
							ignore: "pid,hostname",
						},
					},
				}
			: {}),
	};

	const instance = pino(pinoOptions);

	const logger: Logger = {
		log(event: LogEvent) {
			const { level, message, ...context } = event;
			instance[level](context, message);
		},
	};

	return { pino: instance, logger };
}
