import { Module } from "@nestjs/common";
import { noopAuditSink } from "@repo/infrastructure";
import { AUDIT_SINK } from "./audit.tokens.js";

/**
 * Provides the active `AuditSink` for any handler that wants to
 * record a forensic-relevant event (signin, mutation, denied policy
 * decision, data export). Default is `noopAuditSink` — calls are
 * stamped with id/timestamp but discarded. The lane is inert until a
 * fork swaps the provider for a real sink.
 *
 * No middleware is mounted here: audit is *consumer-pull* (a service
 * `@Inject`s the token and calls `sink.record(...)`), not
 * *middleware-push*. The set of "audit-worthy" actions is
 * application-specific; the middleware-vs-handler choice belongs to
 * the consumer.
 *
 * The contract lives in `@repo/contracts/audit.ts` (per ADR 0010);
 * this module is the application-side wiring (recipe at
 * `docs/recipes/enable-audit.md`).
 */
@Module({
  providers: [
    {
      provide: AUDIT_SINK,
      useValue: noopAuditSink,
    },
  ],
  exports: [AUDIT_SINK],
})
export class AuditModule {}
