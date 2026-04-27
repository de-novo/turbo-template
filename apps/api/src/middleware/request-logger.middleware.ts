import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger.js";
import { httpRequestDurationSeconds, httpRequestsTotal } from "../metrics/http-metrics.js";

// Liveness/readiness/metrics get hit on a tight schedule (Kubernetes probes,
// Prometheus scrape). Logging every one of them is pure noise. Operators who
// want to confirm probe health should use the metrics histogram, not the log
// stream.
const SKIP_PREFIXES = ["/health", "/metrics"];

/**
 * Per-request access log. One line per request with method, path, status, and
 * latency in ms — pino-formatted so it joins the same stream as application
 * logs (and renders nicely under `pino-pretty` in dev).
 *
 * Mount AFTER `requestIdMiddleware` so the request id is on the response
 * header by the time we capture it. The id is closed over the listener, so we
 * don't depend on AsyncLocalStorage outliving res.end().
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }

  const startNs = process.hrtime.bigint();
  const requestId = res.getHeader("x-request-id");
  const requestIdStr = typeof requestId === "string" ? requestId : undefined;

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - startNs;
    const elapsedMs = Number(elapsedNs) / 1_000_000;
    const elapsedSeconds = Number(elapsedNs) / 1_000_000_000;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    // Use the matched Express route template (e.g. "/notes/:id"), not the raw
    // path, for the metric label. Raw paths produce one bucket per id and blow
    // up Prometheus cardinality. `req.route` is populated by the time `finish`
    // fires; unmatched paths fall through to "<unmatched>".
    const route = req.route?.path ?? "<unmatched>";
    const labels = { method: req.method, route, status: String(status) };
    httpRequestDurationSeconds.observe(labels, elapsedSeconds);
    httpRequestsTotal.inc(labels);

    logger.log({
      level,
      message: `${req.method} ${req.path} ${status} ${elapsedMs.toFixed(1)}ms`,
      details: {
        method: req.method,
        path: req.path,
        status,
        latencyMs: Math.round(elapsedMs * 10) / 10,
        ...(requestIdStr ? { requestId: requestIdStr } : {}),
      },
    });
  });

  next();
}
