# Enable notifier

The template ships the notifier contract (per ADR [0008](../adr/0008-notifier-contract.md)) and a
wired `NotifierModule` that provides `NOTIFIER` defaulting to `noopNotifier`. The lane is inert
until you (1) write a real provider adapter and (2) call `notifier.send(...)` from where the message
originates (typically a queue handler).

## When this applies

You need to send user-facing messages: password resets, welcome emails, 2FA codes, invoice receipts,
push notifications, webhook callbacks to partners. Better Auth's password-reset flow needs an email
path eventually, so this recipe lands sooner for most forks than the others in Group A.

## Step 1 — Pick a provider

| Channel | Provider candidates                                                      |
| ------- | ------------------------------------------------------------------------ |
| Email   | Resend, SES, Postmark, SendGrid, Mailgun. Self-hosted: Postal, Listmonk. |
| Push    | Firebase Cloud Messaging (FCM), APNs (direct), OneSignal, Expo Push.     |
| SMS     | Twilio, Vonage, MessageBird. Region-specific: Aliyun (CN), Solapi (KR).  |
| Webhook | Direct HTTPS POST. Optionally with HMAC signature for partner endpoints. |

For most B2B SaaS: **Resend** for email (cheap, great DX, handles DKIM/SPF), **FCM** for push if you
have a mobile app, defer SMS until a real need arrives.

## Step 2 — Implement `Notifier`

For Resend — `apps/api/src/notifier/resend-notifier.ts`:

```ts
import { Injectable } from "@nestjs/common";
import type { NotificationMessage, NotificationResult } from "@repo/contracts";
import type { Notifier } from "@repo/infrastructure";
import { AppError } from "@repo/platform";
import { Effect } from "effect";
import { Resend } from "resend";

@Injectable()
export class ResendNotifier implements Notifier {
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor() {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new AppError({ code: "INTERNAL", message: "RESEND_API_KEY missing." });
    this.client = new Resend(key);
    this.fromAddress = process.env.RESEND_FROM_ADDRESS ?? "noreply@example.com";
  }

  send(message: NotificationMessage): Effect.Effect<NotificationResult, AppError> {
    return Effect.tryPromise({
      try: async () => {
        if (message.recipient.channel !== "email") {
          // Resend handles email only — route push/sms/webhook through
          // a different adapter. A composite notifier (see Step 3) can
          // dispatch by channel.
          return { delivered: false, error: `Unsupported channel: ${message.recipient.channel}` };
        }
        const result = await this.client.emails.send({
          from: this.fromAddress,
          to: message.recipient.address,
          subject: message.subject ?? "(no subject)",
          text: message.body,
        });
        if (result.error) {
          return { delivered: false, error: result.error.message };
        }
        return {
          delivered: true,
          ...(result.data?.id ? { providerMessageId: result.data.id } : {}),
        };
      },
      catch: (cause) =>
        new AppError({ code: "UNAVAILABLE", message: "Notifier send failed.", cause }),
    });
  }
}
```

For multi-channel support, write a composite notifier that dispatches by
`message.recipient.channel`:

```ts
@Injectable()
export class CompositeNotifier implements Notifier {
  constructor(
    private readonly resend: ResendNotifier,
    private readonly fcm: FcmNotifier,
    private readonly twilio: TwilioNotifier,
  ) {}
  send(message) {
    switch (message.recipient.channel) {
      case "email":
        return this.resend.send(message);
      case "push":
        return this.fcm.send(message);
      case "sms":
        return this.twilio.send(message);
      case "webhook":
        return this.webhookSend(message);
    }
  }
}
```

## Step 3 — Swap the `NotifierModule` provider

```ts
import { Module } from "@nestjs/common";
import { NOTIFIER } from "./notifier.tokens.js";
import { ResendNotifier } from "./resend-notifier.js";

@Module({
  providers: [ResendNotifier, { provide: NOTIFIER, useExisting: ResendNotifier }],
  exports: [NOTIFIER],
})
export class NotifierModule {}
```

You'll also want to add `RESEND_API_KEY` and `RESEND_FROM_ADDRESS` to `packages/env/src/apps/api.ts`
and the env example files (per [`add-env-key.md`](./add-env-key.md)).

## Step 4 — Send via the queue (recommended)

The contract permits inline send, but production wiring almost always goes through the queue (per
ADR [0007](../adr/0007-job-queue-contract.md)) so the request path doesn't block on a third-party
network call. The pattern:

1. **Handler** — enqueues a notification job.
2. **Worker** — dequeues, calls `notifier.send`, marks success or retries on failure (the queue
   handles retry budgeting).

```ts
// Handler side:
await runWorkflow(
  this.queue.enqueue({
    name: "notification.send",
    payload: {
      recipient: { channel: "email", address: user.email },
      subject: "Welcome",
      body: `Hi ${user.name}, welcome.`,
    },
    idempotencyKey: `welcome:${user.id}`,
    maxAttempts: 5,
  }),
);

// Worker side (per enable-job-queue.md):
boss.work("notification.send", async (job) => {
  const result = await runWorkflow(notifier.send(job.data));
  if (!result.delivered) throw new Error(result.error ?? "delivery failed"); // pg-boss retries
});
```

For inline send (latency-tolerant, error-surfaceable cases), call `notifier.send` directly from the
handler — same pattern but no queue indirection.

## Step 5 — Test against the memory notifier

`createMemoryNotifier` records sends and exposes `drain()`:

```ts
import { createMemoryNotifier } from "@repo/infrastructure";

const memoryNotifier = createMemoryNotifier();
const moduleRef = await Test.createTestingModule({
  providers: [NotificationWorker, { provide: NOTIFIER, useValue: memoryNotifier }],
}).compile();

test("worker sends the welcome email", async () => {
  await worker.handle({ data: { recipient: { channel: "email", address: "u@x" }, body: "hi" } });

  const sent = memoryNotifier.drain();
  expect(sent).toHaveLength(1);
  expect(sent[0]?.recipient).toEqual({ channel: "email", address: "u@x" });
});
```

`drain()` returns and clears — concurrent tests can each drain between assertions.

## Step 6 — Remove the deferred-capabilities entry

`docs/capabilities.md` carries a **Real notification provider** bullet under "Deferred
capabilities". Delete it once activated.

## Step 7 — Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test

# Set the env keys (or use a sandbox API key — Resend's free tier
# allows sending to verified addresses only):
export RESEND_API_KEY=re_xxx
export RESEND_FROM_ADDRESS=onboarding@your-domain.com
JOBS_ENABLED=true pnpm dev:api

# Trigger a flow that enqueues a notification:
curl -X POST http://localhost:4000/auth/signup -d '{"email":"verified@your-domain.com"}'

# Check the provider's dashboard / inbox for delivery confirmation.
```

## Common pitfalls

- **DKIM/SPF/DMARC not set up** — emails go to spam or get bounced. Resend / SES / Postmark all have
  setup wizards; do this before enabling the lane in production.
- **Sending from `noreply@example.com`** — placeholder in the example above. Real fork sets
  `RESEND_FROM_ADDRESS` to a domain the provider has verified.
- **Inline send blocking the request** — the user's signup waits on Resend's API. Move to queued
  send unless you specifically need the request to fail when delivery fails (rare).
- **No retry on transient failures** — the contract reports `delivered: false` rather than throwing,
  but if you call inline and ignore the result, transient failures are silently lost. Pair with the
  queue (which retries automatically) or check the result.
- **PII in email body logs** — if you log the full `NotificationMessage` for debugging, you may leak
  email addresses, names, secrets. Strip body / data fields from log output, or only log the
  recipient channel + delivery outcome.
- **Templating** — the contract carries plain `body` (no template language). Use the provider's
  templates (Resend Templates, SES SDK Templates) or render server-side with MJML / Handlebars
  before calling `send`.

## References

- ADR [0008 — Notifier contract](../adr/0008-notifier-contract.md)
- `apps/api/src/notifier/notifier.module.ts` — wiring
- `packages/contracts/src/notification.ts` — `NotificationMessage`, `NotificationRecipient`,
  `NotificationResult`
- `packages/infrastructure/src/notification.ts` — `Notifier` port + `noopNotifier` +
  `createMemoryNotifier`
- [`enable-job-queue.md`](./enable-job-queue.md) — typical wiring (enqueue → worker → send)
- Resend docs: <https://resend.com/docs>
- Better Auth email path: <https://www.better-auth.com/docs/concepts/email>
