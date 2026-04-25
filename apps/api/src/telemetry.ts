/**
 * OpenTelemetry bootstrap for the api.
 *
 * MUST be imported as the first statement of `main.ts` so the SDK
 * patches Node modules (http, fetch, pg, express, …) BEFORE NestJS
 * loads them. If imported later, instrumentation is silently ignored
 * for already-loaded modules.
 *
 * The SDK is opt-in: it only starts when `OTEL_EXPORTER_OTLP_ENDPOINT`
 * is set. Local development without a collector stays free of
 * tracing overhead.
 *
 * Configurable via standard OTEL_* env vars
 * (https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/):
 *
 * - OTEL_EXPORTER_OTLP_ENDPOINT     — required to enable. Pointed at
 *                                    a collector or vendor endpoint.
 * - OTEL_SERVICE_NAME              — fallback service identity if
 *                                    PROJECT_SLUG is unset (we use
 *                                    PROJECT_SLUG by default).
 * - OTEL_RESOURCE_ATTRIBUTES       — comma-separated extra resource
 *                                    attributes (e.g. deploy.env=prod).
 * - OTEL_TRACES_SAMPLER            — sampler choice (e.g.
 *                                    parentbased_traceidratio).
 * - OTEL_TRACES_SAMPLER_ARG        — sampler argument (e.g. 0.1).
 *
 * The collector receiver must speak OTLP/HTTP. Switch to gRPC by
 * swapping the exporter import.
 */
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];

if (endpoint) {
	const serviceName =
		process.env["OTEL_SERVICE_NAME"] ?? process.env["PROJECT_SLUG"] ?? "api";
	const serviceVersion = process.env["npm_package_version"] ?? "0.0.0";

	const sdk = new NodeSDK({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: serviceName,
			[ATTR_SERVICE_VERSION]: serviceVersion,
		}),
		traceExporter: new OTLPTraceExporter(),
		instrumentations: [
			getNodeAutoInstrumentations({
				// Drop fs noise — every read/write becomes a span otherwise.
				"@opentelemetry/instrumentation-fs": { enabled: false },
				// Pino auto-instrumentation already adds trace_id / span_id
				// via the existing logger pipeline.
				"@opentelemetry/instrumentation-pino": { enabled: true },
			}),
		],
	});

	sdk.start();

	// Best-effort flush on shutdown so in-flight spans aren't lost.
	const shutdown = async () => {
		try {
			await sdk.shutdown();
		} catch {
			// swallow — we're already shutting down
		}
	};
	process.once("SIGTERM", shutdown);
	process.once("SIGINT", shutdown);
}
