import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import type { ApiEnv } from "@repo/env/apps/api";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { API_ENV } from "./db/db.tokens.js";

export const REQUEST_ID_HEADER = "x-request-id";

@Module({
	imports: [
		PinoLoggerModule.forRootAsync({
			inject: [API_ENV],
			useFactory: (env: ApiEnv) => {
				const prettyTransport = {
					target: "pino-pretty" as const,
					options: {
						colorize: true,
						translateTime: "SYS:HH:MM:ss.l",
						ignore: "pid,hostname",
					},
				};

				return {
					pinoHttp: {
						level: env.NODE_ENV === "production" ? "info" : "debug",
						base: { service: env.PROJECT_SLUG },
						genReqId: (req, res) => {
							const existing = req.headers[REQUEST_ID_HEADER];
							const id = Array.isArray(existing) ? existing[0] : existing;
							const requestId = id ?? randomUUID();
							res.setHeader(REQUEST_ID_HEADER, requestId);
							return requestId;
						},
						redact: {
							paths: [
								"req.headers.authorization",
								"req.headers.cookie",
								'req.headers["set-cookie"]',
								'res.headers["set-cookie"]',
								"password",
							],
							censor: "[redacted]",
						},
						...(env.NODE_ENV !== "production"
							? { transport: prettyTransport }
							: {}),
					},
				};
			},
		}),
	],
	exports: [PinoLoggerModule],
})
export class LoggerModule {}
