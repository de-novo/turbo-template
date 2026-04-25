// Telemetry MUST be the first import — the OTel SDK patches Node
// modules before NestJS pulls them in. Anything imported above it
// loses instrumentation silently.
import "./telemetry.js";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { type ApiEnv, loadApiEnv } from "@repo/env/apps/api";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter.js";
import { AppErrorFilter } from "./filters/app-error.filter.js";

let env: ApiEnv;
try {
	env = loadApiEnv();
} catch (error) {
	process.stderr.write(
		`[api] invalid environment:\n${error instanceof Error ? error.message : String(error)}\n`,
	);
	process.exit(1);
}

const app = await NestFactory.create(AppModule, {
	cors: {
		origin: [env.WEB_ORIGIN],
		credentials: true,
	},
	bufferLogs: true,
});

app.useLogger(app.get(Logger));
app.useGlobalFilters(new AllExceptionsFilter(), new AppErrorFilter());

const openApiConfig = new DocumentBuilder()
	.setTitle(`${env.PROJECT_NAME} API`)
	.setDescription(
		`REST surface for ${env.PROJECT_SLUG}. /auth/* is managed by Better Auth and excluded from this document.`,
	)
	.setVersion("0.0.0")
	.build();
const document = SwaggerModule.createDocument(app, openApiConfig);
SwaggerModule.setup("docs", app, document);

await app.listen(env.PORT);

const bootLogger = app.get(Logger);
bootLogger.log(
	`listening on http://localhost:${env.PORT} (env=${env.NODE_ENV})`,
);
bootLogger.log(`OpenAPI UI at http://localhost:${env.PORT}/docs`);
