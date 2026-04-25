import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initOpenTelemetry } from "./observability.js";

beforeEach(() => {
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("initOpenTelemetry skips initialization when no endpoint is configured", () => {
  const handle = initOpenTelemetry({ serviceName: "test" });
  expect(handle).toBeNull();
});

test("initOpenTelemetry honors the env endpoint when no option is passed", async () => {
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318");
  const handle = initOpenTelemetry({ serviceName: "test" });
  expect(handle).not.toBeNull();
  await handle?.shutdown();
});
