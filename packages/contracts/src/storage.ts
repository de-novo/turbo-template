import { z } from "zod";
import { tenantIdSchema } from "./tenant.js";

/**
 * Object-storage contract: typed handles for storing, retrieving, and
 * pre-signing access to opaque blobs (uploaded images, exports, generated
 * PDFs, transcoded media). The runtime port is in
 * `@repo/infrastructure/storage.ts`. Real providers — S3, R2, GCS, Azure
 * Blob, MinIO — plug in by implementing `ObjectStorage`.
 *
 * The contract assumes a buffered `Uint8Array` body, which covers small
 * to medium objects (config snapshots, thumbnails, exported reports,
 * scanned PDFs). Streaming for large multi-GB uploads is provider-
 * specific and intentionally not normalized here; real adapters extend
 * with their own stream methods. See ADR
 * docs/adr/0009-object-storage-contract.md.
 */

/**
 * Slash-delimited path key. Allows ASCII letters, digits, dashes,
 * underscores, dots, and forward slashes. No leading slash, no `..`
 * traversal, no double slashes. Long enough for tenant-prefixed keys
 * (`tenants/<id>/uploads/<uuid>.png`) but short enough to fit S3's
 * 1024-byte limit by a wide margin.
 */
export const storageObjectKeySchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/, "invalid object key")
  .refine((key) => key.split("/").every((segment) => segment !== "." && segment !== ".."), {
    message: "object key must not contain . or .. path segments",
  });
export type StorageObjectKey = z.infer<typeof storageObjectKeySchema>;

export const storageObjectMetadataSchema = z.object({
  key: storageObjectKeySchema,
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().min(1).optional(),
  lastModified: z.string().datetime(),
  tenantId: tenantIdSchema.optional(),
});
export type StorageObjectMetadata = z.infer<typeof storageObjectMetadataSchema>;

export const signedUrlOperationSchema = z.enum(["get", "put"]);
export type SignedUrlOperation = z.infer<typeof signedUrlOperationSchema>;

export const signedUrlRequestSchema = z.object({
  key: storageObjectKeySchema,
  operation: signedUrlOperationSchema,
  expiresInSeconds: z
    .number()
    .int()
    .positive()
    .max(7 * 24 * 60 * 60),
  contentType: z.string().min(1).optional(),
  contentLength: z.number().int().positive().optional(),
});
export type SignedUrlRequest = z.infer<typeof signedUrlRequestSchema>;

export const signedUrlSchema = z.object({
  url: z.url(),
  expiresAt: z.string().datetime(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type SignedUrl = z.infer<typeof signedUrlSchema>;
