import { z } from "zod";
import { idSchema } from "./ids.js";
import { tenantIdSchema } from "./tenant.js";

/**
 * Outbound user-facing message contract: email, push, SMS, webhook. The
 * runtime port is in `@repo/infrastructure/notification.ts`. Real
 * providers (Resend, SES, Postmark, Twilio, Firebase, generic webhook)
 * plug in by implementing `Notifier`.
 *
 * Most production wiring will *enqueue* a notification job
 * (`@repo/contracts/job`) and let a worker call the notifier — sending
 * inline blocks the request on a third-party network call. The contract
 * does not enforce that; both inline and queued shapes are valid. See
 * ADR docs/adr/0008-notifier-contract.md.
 */

export const notificationChannelSchema = z.enum(["email", "push", "sms", "webhook"]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

/**
 * Channel-typed recipient discriminator. The shape that is valid depends
 * on the channel — email needs an address, push needs a device token, sms
 * needs a phone number, webhook needs a URL. The discriminator keeps
 * cross-channel mistakes (sending an email to a phone number) at the
 * type-system layer.
 */
export const notificationRecipientSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), address: z.email() }),
  z.object({ channel: z.literal("push"), deviceToken: z.string().min(1) }),
  z.object({ channel: z.literal("sms"), phone: z.string().min(1) }),
  z.object({ channel: z.literal("webhook"), url: z.url() }),
]);
export type NotificationRecipient = z.infer<typeof notificationRecipientSchema>;

export const notificationMessageSchema = z.object({
  recipient: notificationRecipientSchema,
  subject: z.string().min(1).optional(),
  body: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  tenantId: tenantIdSchema.optional(),
});
export type NotificationMessage = z.infer<typeof notificationMessageSchema>;

export const notificationResultSchema = z.object({
  delivered: z.boolean(),
  providerMessageId: idSchema.optional(),
  error: z.string().optional(),
});
export type NotificationResult = z.infer<typeof notificationResultSchema>;
