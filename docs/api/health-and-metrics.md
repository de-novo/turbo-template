# Health and metrics

Operational surfaces consumed by Kubernetes / ALB / load-balancer probes and by Prometheus scrapers.
All routes here are exempt from the global throttle (`@SkipThrottle`) and require no auth — they are
designed to be hammered by infrastructure.

- **Health controller:**
  [`apps/api/src/health/health.controller.ts`](../../apps/api/src/health/health.controller.ts)
- **Metrics controller:**
  [`apps/api/src/metrics/metrics.controller.ts`](../../apps/api/src/metrics/metrics.controller.ts)
- **HTTP metrics setup:**
  [`apps/api/src/metrics/http-metrics.ts`](../../apps/api/src/metrics/http-metrics.ts)
- **Health helper:** `@repo/infrastructure` (`healthy()` factory).
- **DB-aware readiness:** `@repo/db` (`checkDatabase`, `databaseNotConfigured`).

## Routes

| Method | Path            | Status    | Auth | Throttle | Response                                                                                           |
| ------ | --------------- | --------- | ---- | -------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/health/live`  | 200       | none | exempt   | `{ ok: true, data: { status: "ok", service: PROJECT_SLUG } }`                                      |
| GET    | `/health/ready` | 200 / 503 | none | exempt   | 200: `{ ok: true, data: { status, service, database } }` · 503: `apiFailureSchema` (`UNAVAILABLE`) |
| GET    | `/health`       | 200 / 503 | none | exempt   | Alias for `/health/ready` (preserved for probes that pre-date the split).                          |
| GET    | `/metrics`      | 200       | none | exempt   | Prometheus text exposition format. `Content-Type: text/plain; version=0.0.4`.                      |

## `/health/live`

Process is up and responding to HTTP. Always returns 200 if the NestJS event loop is alive — does
not check downstream dependencies. Use as Kubernetes `livenessProbe` (failure = restart the pod).

## `/health/ready`

Process is ready to receive traffic. Returns:

- **200** when the in-process health (`@repo/infrastructure/healthy()`) reports healthy AND the
  database (when `DATABASE_URL` is set) is reachable.
- **503** when the database is `down` — the body still uses the `apiFailureSchema` envelope with
  `code: "UNAVAILABLE"`. The 503 signals Kubernetes / ALB to drop the pod from the ready pool until
  the database recovers.
- **200** when no `DATABASE_URL` is configured — the readiness check treats "no database" as
  `not-configured`, not as a failure (the API can serve auth in-memory and other non-DB routes).

Use as Kubernetes `readinessProbe` (failure = remove from service endpoints, but do not restart).

## `/metrics`

Prometheus text format. Default Node.js metrics from `prom-client` plus two HTTP-specific series
wired in [`http-metrics.ts`](../../apps/api/src/metrics/http-metrics.ts):

| Metric                          | Type      | Labels                | Notes                                                                                               |
| ------------------------------- | --------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `http_request_duration_seconds` | histogram | method, route, status | Buckets: 5ms → 10s (eight buckets). Route is the template (`req.route?.path`), not the URL.         |
| `http_requests_total`           | counter   | method, route, status | Same labeling as the histogram. Unmatched routes report `route="<unmatched>"` to bound cardinality. |

Default Node metrics include `process_cpu_seconds_total`, `nodejs_eventloop_lag_seconds`, GC stats,
heap stats, etc. — see [prom-client docs](https://github.com/siimon/prom-client) for the full list.

### Cardinality posture

Route labels use the template string (`/notes/:id`), not the literal URL (`/notes/abc`), so the time
series count stays bounded by the endpoint catalog. The fallback `<unmatched>` bucket prevents
adversaries from inflating Prometheus storage by hammering random URLs.

## Curl

```bash
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
curl http://localhost:4000/metrics
```
