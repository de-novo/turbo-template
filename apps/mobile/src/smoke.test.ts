import { expect, test } from "@jest/globals";

test("jest-expo harness runs assertions in the mobile workspace", () => {
  const payload = JSON.parse('{"ok":true,"data":{"id":"abc"}}');
  expect(payload.ok).toBe(true);
  expect(payload.data.id).toBe("abc");
});
