import type { NotificationMessage, NotificationResult } from "@repo/contracts";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";

/**
 * Outbound notification port. Real adapters (Resend, SES, Postmark,
 * Twilio, Firebase, generic webhook) implement `send`; failures map onto
 * `AppError` so callers report them through the same envelope as any
 * other infra error.
 *
 * `noopNotifier` returns `delivered: false` silently — fine for solo
 * deploys that haven't activated the lane. `createMemoryNotifier` records
 * sent messages in an internal list and exposes `drain()` for tests
 * (`expect(notifier.drain()).toContainEqual(...)`).
 *
 * In production wiring, the typical pattern is to *enqueue* a notification
 * job (`@repo/contracts/job`) and let a worker call the notifier — sending
 * inline blocks the request on a third-party network call. See ADR
 * docs/adr/0008-notifier-contract.md.
 */
export type Notifier = {
  send(message: NotificationMessage): Effect.Effect<NotificationResult, AppError>;
};

export const noopNotifier: Notifier = {
  send: () => Effect.succeed({ delivered: false }),
};

export type MemoryNotifier = Notifier & {
  drain(): NotificationMessage[];
};

export function createMemoryNotifier(): MemoryNotifier {
  const sent: NotificationMessage[] = [];
  let nextId = 0;

  return {
    send: (message) =>
      Effect.sync(() => {
        sent.push(message);
        return {
          delivered: true,
          providerMessageId: `mem_${++nextId}`,
        };
      }),
    drain: () => {
      const snapshot = sent.slice();
      sent.length = 0;
      return snapshot;
    },
  };
}
