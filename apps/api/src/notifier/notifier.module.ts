import { Module } from "@nestjs/common";
import { noopNotifier } from "@repo/infrastructure";
import { NOTIFIER } from "./notifier.tokens.js";

/**
 * Provides the active `Notifier` for outbound email / push / sms /
 * webhook messages. Default is `noopNotifier` — `send` returns
 * `delivered: false` silently. The lane is inert until a fork swaps
 * the provider (recipe at `docs/recipes/enable-notifier.md`).
 *
 * Production wiring typically enqueues a notification job (per ADR
 * 0007) and lets a worker call `notifier.send` — sending inline
 * blocks the request on a third-party network call. See ADR 0008
 * for the contract.
 */
@Module({
  providers: [
    {
      provide: NOTIFIER,
      useValue: noopNotifier,
    },
  ],
  exports: [NOTIFIER],
})
export class NotifierModule {}
