import { Counter, Histogram, collectDefaultMetrics, register } from "prom-client";

// Default Node.js metrics (event loop, GC, heap, handles). One-shot wiring at
// module load — re-importing this module is a no-op because prom-client's
// register is a singleton.
collectDefaultMetrics({ register });

/**
 * Per-request latency histogram. Buckets cover the realistic API latency
 * spectrum from a fast in-memory hit (5ms) to a slow upstream timeout (10s).
 *
 * Labels:
 *   - method: HTTP verb (GET, POST, …) — bounded.
 *   - route:  Express route template (e.g. "/notes/:id"), NOT the raw path,
 *             to keep cardinality bounded. Falls back to "<unmatched>" for
 *             requests that didn't resolve a route (404s on unknown paths).
 *   - status: HTTP status code as a string ("200", "404", …) — bounded.
 *
 * Convention is `_seconds` for time-based histograms (Prometheus best practice
 * for Grafana / alerting integration).
 */
export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds, bucketed.",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Per-request counter. Same labels as the histogram so a Grafana panel can pivot
 * on `rate(http_requests_total[1m])` for QPS without needing the histogram count.
 */
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed.",
  labelNames: ["method", "route", "status"] as const,
  registers: [register],
});
