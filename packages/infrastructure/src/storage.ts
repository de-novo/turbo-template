import type {
  SignedUrl,
  SignedUrlRequest,
  StorageObjectKey,
  StorageObjectMetadata,
  TenantId,
} from "@repo/contracts";
import { AppError } from "@repo/platform";
import type { AppError as AppErrorType } from "@repo/platform";
import { Effect } from "effect";

/**
 * Object-storage port. Adapters for S3, R2, GCS, Azure Blob, MinIO
 * implement this interface; the memory adapter covers tests and tiny
 * single-process deploys.
 *
 * Body shape is `Uint8Array` for the simple put / get / head pattern.
 * Streaming for large multi-GB transfers is provider-specific
 * (S3 multipart, GCS resumable) and intentionally not normalized in this
 * port — real adapters extend with their own stream methods. See ADR
 * docs/adr/0009-object-storage-contract.md.
 *
 * `signUrl` returns a presigned URL the caller hands to a browser /
 * mobile client for direct upload or download. The memory adapter emits
 * a `mem://` URL scheme so tests can assert "a signed URL was issued"
 * without needing a real signer; production adapters return https URLs.
 */
export type PutOptions = {
  contentType: string;
  tenantId?: TenantId;
};

export type ObjectStorage = {
  put(
    key: StorageObjectKey,
    body: Uint8Array,
    options: PutOptions,
  ): Effect.Effect<StorageObjectMetadata, AppErrorType>;
  get(
    key: StorageObjectKey,
  ): Effect.Effect<{ body: Uint8Array; metadata: StorageObjectMetadata }, AppErrorType>;
  head(key: StorageObjectKey): Effect.Effect<StorageObjectMetadata, AppErrorType>;
  delete(key: StorageObjectKey): Effect.Effect<void, AppErrorType>;
  signUrl(request: SignedUrlRequest): Effect.Effect<SignedUrl, AppErrorType>;
};

const notFound = (key: string) =>
  new AppError({ code: "NOT_FOUND", message: `Object ${key} not found.` });

export const noopObjectStorage: ObjectStorage = {
  put: () => Effect.fail(new AppError({ code: "UNAVAILABLE", message: "Storage disabled." })),
  get: (key) => Effect.fail(notFound(key)),
  head: (key) => Effect.fail(notFound(key)),
  delete: () => Effect.void,
  signUrl: () => Effect.fail(new AppError({ code: "UNAVAILABLE", message: "Storage disabled." })),
};

type MemoryRecord = {
  body: Uint8Array;
  metadata: StorageObjectMetadata;
};

export function createMemoryObjectStorage(): ObjectStorage {
  const objects = new Map<string, MemoryRecord>();
  let nextEtag = 0;

  return {
    put: (key, body, options) =>
      Effect.sync(() => {
        const metadata: StorageObjectMetadata = {
          key,
          contentType: options.contentType,
          sizeBytes: body.byteLength,
          etag: `mem-${++nextEtag}`,
          lastModified: new Date().toISOString(),
          ...(options.tenantId ? { tenantId: options.tenantId } : {}),
        };
        objects.set(key, { body, metadata });
        return metadata;
      }),
    get: (key) =>
      Effect.suspend(() => {
        const record = objects.get(key);
        if (!record) return Effect.fail(notFound(key));
        return Effect.succeed(record);
      }),
    head: (key) =>
      Effect.suspend(() => {
        const record = objects.get(key);
        if (!record) return Effect.fail(notFound(key));
        return Effect.succeed(record.metadata);
      }),
    delete: (key) =>
      Effect.sync(() => {
        objects.delete(key);
      }),
    signUrl: (request) =>
      Effect.sync(() => {
        const expiresAt = new Date(Date.now() + request.expiresInSeconds * 1000).toISOString();
        return {
          url: `mem://${request.operation}/${request.key}?expires=${encodeURIComponent(expiresAt)}`,
          expiresAt,
        };
      }),
  };
}
