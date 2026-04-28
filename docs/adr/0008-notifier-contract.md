# 0008 — Notifier contract, provider deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Almost every product eventually sends a user-facing message: a welcome email, a password reset, a
2FA code, an invoice receipt, a push notification, a webhook back to a third party. Each provider
has its own SDK, env shape, sender-identity flow, and rate limits — Resend, SES, Postmark, SendGrid
for email; Twilio for SMS; Firebase Cloud Messaging / APNs for push; raw HTTPS for webhooks.

Two pressures collide: Better Auth's password-reset path _needs_ an email sender to be functional in
any deploy that exposes it, so the absence of a notifier contract is a friction point even on day
one. At the same time, picking Resend (or SES, or Postmark) as the default biases every fork toward
a sender they may not use. ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md)
says: ship the contract, defer the provider.

## Decision

Ship the notifier contract with a memory recorder + a no-op default. Real providers plug in by
implementing `Notifier`.

- **Schema** — `@repo/contracts/notification.ts` exports `notificationChannelSchema` (`email` /
  `push` / `sms` / `webhook`), `notificationRecipientSchema` (channel-typed discriminated union —
  email needs an address, push needs a device token, sms needs a phone, webhook needs a URL),
  `notificationMessageSchema` (recipient, optional subject, body string, structured `data`, optional
  `tenantId`), and `notificationResultSchema` (`delivered`, optional `providerMessageId`, optional
  `error`). The discriminator keeps cross-channel mistakes (sending an email payload to a phone
  recipient) at the type-system layer.
- **Port** — `@repo/infrastructure/notification.ts` exports `Notifier` (single method:
  `send(message) → Effect<NotificationResult, AppError>`).
- **Adapters** —
  - `noopNotifier` — returns `delivered: false` silently. Solo default; the lane is inert until a
    real provider is wired.
  - `createMemoryNotifier()` — records sent messages in an internal list and exposes `drain()` for
    tests (`expect(notifier.drain()).toContainEqual(...)`). Sufficient for integration tests of any
    handler that triggers a notification.

The contract does not enforce _how_ a notifier is invoked. Two patterns are both valid:

- **Inline send** — small / latency-tolerant cases, like a webhook that must surface a delivery
  error to the caller.
- **Enqueue → worker → send** — the typical production pattern, where a request handler calls
  `queue.enqueue({ name: "user.welcome.email", payload, idempotencyKey })` (per ADR
  [0007 — Job queue contract](./0007-job-queue-contract.md)) and a worker dequeues and calls
  `notifier.send`. This isolates the request path from third-party network latency and gives retries
  for free.

## Consequences

- **Benefits**:
  - Better Auth can wire `noopNotifier` on day one and continue to boot; activating password-reset
    email is a swap to Resend / SES / Postmark rather than a contract refactor.
  - Tests for any handler that triggers a notification can use `createMemoryNotifier` and assert on
    `drain()` — no provider sandbox keys, no network calls in CI.
  - The discriminated recipient prevents the entire class of bug where a refactor swaps `address`
    for `phone` and an email payload silently targets an SMS endpoint.
  - `tenantId` flows through the message (per ADR
    [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md)) so per-tenant sender identity
    / footers / rate limits work without retrofitting.
- **Costs**:
  - The contract is intentionally minimal — no template language, no attachments, no inline media.
    Real providers handle those via their own SDKs; the contract carries `data` (a free-form record)
    for consumers that want to pass through templating variables.
  - The `delivered` boolean is reported by the _adapter_, not by the receiving inbox. A
    `delivered: true` from Resend means "Resend accepted the request"; deliverability tracking
    (bounces, opens) is out of scope.
- **Risks / open questions**:
  - Templating (Handlebars / MJML / Liquid for HTML email) is not part of the contract. The `body`
    field is a string; HTML vs text is the sender's choice. A future ADR may add a `bodyFormat`
    discriminator if a real consumer needs it.
  - `idempotencyKey` is on the _job_ descriptor, not the notification message —
    duplicate-suppression for "user-clicked-resend-twice" is expected to live in the queue layer,
    not in the notifier. A direct inline-send caller has to handle dedup itself.

## Alternatives considered

- **Ship Resend as the default**: rejected per ADR 0001. Picks one of several reasonable senders;
  forks that prefer SES / Postmark / SendGrid / a transactional email service of their own have to
  remove the default.
- **Channel-flat `recipient` (single `address` string)**: rejected. Too loose — refactors swap field
  meanings silently. The discriminated union is one extra type at the call site for a real
  correctness gain.
- **Bake email templating into the contract**: rejected. Each provider has its own
  template-rendering stance (Resend Templates, SES SDK Templates, server-side MJML); pinning one
  would force a render step the consumer might not want.
- **Reuse the outbox for notification publish**: rejected. Outbox guarantees at-least-once publish;
  notifications usually want at-least-once delivery, plus per-message retry budgets, plus idempotent
  dedup — the queue layer (ADR 0007) is the better building block.

## References

- `packages/contracts/src/notification.ts` — schemas + types
- `packages/infrastructure/src/notification.ts` — `Notifier` port + memory + noop
- `apps/api/src/auth/` — Better Auth wiring (currently no email path; this ADR is the contract that
  lets one land cleanly)
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — `tenantId` carries through
- ADR [0007 — Job queue contract](./0007-job-queue-contract.md) — typical wiring (enqueue-then-send)
