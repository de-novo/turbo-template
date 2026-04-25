import { Writable } from "node:stream";
import { expect, test } from "vitest";
import { createPinoLogger, withLoggerContext } from "./logger.js";

function captureLines() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { lines, stream };
}

test("pino logger emits NDJSON with the LoggerContext fields", () => {
  const { lines, stream } = captureLines();
  const logger = createPinoLogger({ destination: stream, serviceName: "api" });

  logger.log({
    level: "info",
    message: "hello",
    requestId: "req_1",
    details: { route: "/health" },
  });

  expect(lines).toHaveLength(1);
  const event = JSON.parse(lines[0] ?? "");
  expect(event.msg).toBe("hello");
  expect(event.requestId).toBe("req_1");
  expect(event.serviceName).toBe("api");
  expect(event.route).toBe("/health");
});

test("pino logger filters below the configured level", () => {
  const { lines, stream } = captureLines();
  const logger = createPinoLogger({ destination: stream, level: "warn" });

  logger.log({ level: "info", message: "ignored" });
  logger.log({ level: "warn", message: "kept" });
  logger.log({ level: "error", message: "kept" });

  expect(lines).toHaveLength(2);
});

test("logger merges the ambient LoggerContext from withLoggerContext", () => {
  const { lines, stream } = captureLines();
  const logger = createPinoLogger({ destination: stream });

  withLoggerContext({ requestId: "req_ambient" }, () => {
    logger.log({ level: "info", message: "scoped" });
  });

  const event = JSON.parse(lines[0] ?? "");
  expect(event.requestId).toBe("req_ambient");
});
