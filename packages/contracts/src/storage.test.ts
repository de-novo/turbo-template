import { expect, test } from "vitest";
import {
  signedUrlRequestSchema,
  signedUrlSchema,
  storageObjectKeySchema,
  storageObjectMetadataSchema,
} from "./storage.js";

test("storageObjectKeySchema accepts a tenant-prefixed path", () => {
  expect(storageObjectKeySchema.safeParse("tenants/t-1/uploads/file.png").success).toBe(true);
});

test("storageObjectKeySchema rejects leading slash", () => {
  expect(storageObjectKeySchema.safeParse("/leading").success).toBe(false);
});

test("storageObjectKeySchema rejects path traversal", () => {
  expect(storageObjectKeySchema.safeParse("uploads/../etc/passwd").success).toBe(false);
});

test("storageObjectKeySchema rejects double slashes", () => {
  expect(storageObjectKeySchema.safeParse("uploads//file.png").success).toBe(false);
});

test("storageObjectMetadataSchema validates a fully populated record", () => {
  const result = storageObjectMetadataSchema.safeParse({
    key: "uploads/file.png",
    contentType: "image/png",
    sizeBytes: 1024,
    etag: "abc-123",
    lastModified: "2026-04-28T00:00:00.000Z",
    tenantId: "tenant-1",
  });
  expect(result.success).toBe(true);
});

test("signedUrlRequestSchema rejects expiresInSeconds beyond 7 days", () => {
  const result = signedUrlRequestSchema.safeParse({
    key: "uploads/file.png",
    operation: "get",
    expiresInSeconds: 30 * 24 * 60 * 60,
  });
  expect(result.success).toBe(false);
});

test("signedUrlRequestSchema accepts a put with contentType + contentLength", () => {
  const result = signedUrlRequestSchema.safeParse({
    key: "uploads/file.png",
    operation: "put",
    expiresInSeconds: 300,
    contentType: "image/png",
    contentLength: 1024,
  });
  expect(result.success).toBe(true);
});

test("signedUrlSchema validates the response shape", () => {
  const result = signedUrlSchema.safeParse({
    url: "https://signed.example.com/file?token=x",
    expiresAt: "2026-04-28T00:05:00.000Z",
    headers: { "x-amz-server-side-encryption": "AES256" },
  });
  expect(result.success).toBe(true);
});
