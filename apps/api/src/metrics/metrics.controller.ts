import { Controller, Get, Header } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { collectDefaultMetrics, register } from "prom-client";

// Register default Node.js + process metrics once at module load.
// prom-client's registry is global; calling collectDefaultMetrics
// multiple times duplicates series, so this lives at module scope
// rather than in a constructor.
collectDefaultMetrics();

/**
 * GET /metrics — Prometheus scrape endpoint.
 *
 * Excluded from the global throttler because Prometheus typically
 * scrapes every 15s; that would otherwise eat the per-IP budget. The
 * endpoint is unauthenticated by design — restrict it at the network
 * layer (private VPC, sidecar proxy, ingress allow-list) rather than
 * with bearer auth, since scrapers don't carry one.
 *
 * Add custom metrics by importing `register` and registering a
 * `Counter` / `Gauge` / `Histogram` from `prom-client` next to the
 * code you want to observe. The default metrics here cover process
 * memory, GC, event-loop lag, and Node-internal counters.
 */
@SkipThrottle()
@Controller("metrics")
export class MetricsController {
	@Get()
	@Header("content-type", register.contentType)
	async metrics(): Promise<string> {
		return register.metrics();
	}
}
