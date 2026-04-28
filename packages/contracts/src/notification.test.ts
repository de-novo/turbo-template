import { expect, test } from "vitest";
import { notificationMessageSchema, notificationRecipientSchema } from "./notification.js";

test("recipient discriminator validates an email recipient", () => {
  const result = notificationRecipientSchema.safeParse({
    channel: "email",
    address: "user@example.com",
  });
  expect(result.success).toBe(true);
});

test("recipient discriminator rejects an email channel with a phone field", () => {
  const result = notificationRecipientSchema.safeParse({
    channel: "email",
    phone: "+15551234",
  });
  expect(result.success).toBe(false);
});

test("recipient discriminator validates a push recipient", () => {
  const result = notificationRecipientSchema.safeParse({
    channel: "push",
    deviceToken: "token-1",
  });
  expect(result.success).toBe(true);
});

test("recipient discriminator validates a webhook URL", () => {
  const result = notificationRecipientSchema.safeParse({
    channel: "webhook",
    url: "https://hooks.example.com/notify",
  });
  expect(result.success).toBe(true);
});

test("recipient discriminator rejects a malformed URL on the webhook channel", () => {
  const result = notificationRecipientSchema.safeParse({
    channel: "webhook",
    url: "not-a-url",
  });
  expect(result.success).toBe(false);
});

test("notificationMessageSchema validates a tenanted email", () => {
  const result = notificationMessageSchema.safeParse({
    recipient: { channel: "email", address: "u@example.com" },
    subject: "Welcome",
    body: "Hello!",
    tenantId: "tenant-1",
  });
  expect(result.success).toBe(true);
});

test("notificationMessageSchema rejects an empty body", () => {
  const result = notificationMessageSchema.safeParse({
    recipient: { channel: "sms", phone: "+15551234" },
    body: "",
  });
  expect(result.success).toBe(false);
});
