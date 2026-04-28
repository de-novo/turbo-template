import { Module } from "@nestjs/common";
import { noopOutboxRelay } from "@repo/infrastructure";
import { OUTBOX_RELAY } from "./outbox.tokens.js";

/**
 * Provides the active `OutboxRelay`. Default is `noopOutboxRelay` —
 * `claimBatch` returns empty, `markPublished` / `markFailed` are
 * silent no-ops. The lane is inert until a fork swaps the provider
 * (recipe at `docs/recipes/enable-outbox-relay.md`) AND mounts a
 * worker that drives the relay loop.
 *
 * No middleware is mounted here. Outbox writes happen inside the
 * application's existing DB transaction (alongside the business
 * mutation), not through the relay — the relay is the *forwarding*
 * side. See ADR 0005 for the contract.
 */
@Module({
  providers: [
    {
      provide: OUTBOX_RELAY,
      useValue: noopOutboxRelay,
    },
  ],
  exports: [OUTBOX_RELAY],
})
export class OutboxModule {}
