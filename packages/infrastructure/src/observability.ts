import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";

export type ObservabilityOptions = {
  serviceName: string;
  endpoint?: string;
  serviceVersion?: string;
};

export type ObservabilityHandle = {
  shutdown(): Promise<void>;
};

export function initOpenTelemetry(options: ObservabilityOptions): ObservabilityHandle | null {
  const endpoint = options.endpoint ?? process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  if (!endpoint) {
    return null;
  }

  const resource = resourceFromAttributes({
    "service.name": options.serviceName,
    ...(options.serviceVersion ? { "service.version": options.serviceVersion } : {}),
  });

  const normalized = endpoint.replace(/\/$/, "");
  const traceExporter = new OTLPTraceExporter({
    url: normalized.endsWith("/v1/traces") ? normalized : `${normalized}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
  });

  sdk.start();

  return {
    shutdown: () => sdk.shutdown(),
  };
}
