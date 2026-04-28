# 0009 — Object storage contract, provider deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Almost every product eventually stores opaque blobs: user-uploaded images, generated PDFs, exported
CSVs, transcoded media, scanned documents. Each provider has its own SDK, env shape, region routing,
and signing flow — AWS S3, Cloudflare R2, Google Cloud Storage, Azure Blob, MinIO, Backblaze B2.
Real production almost always uses one of those rather than the application's own filesystem.

The template needs the _contract_ — typed object keys, metadata, signed-URL request/response shapes,
and a port for put / get / head / delete / sign — so application code that handles uploads lands the
right abstraction. Picking a provider on day one biases every fork toward an SDK and an env shape
they may not use, exactly the day-one-overreach failure ADR
[0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) exists to prevent.

## Decision

Ship the storage contract with a memory adapter for tests and a no-op default for solo deploys that
don't need storage. Real providers plug in by implementing `ObjectStorage`.

- **Schema** — `@repo/contracts/storage.ts` exports `storageObjectKeySchema` (slash-delimited path,
  no leading slash, no `..` segments, no `.` segments, no double slashes, max 512 chars),
  `storageObjectMetadataSchema` (key, contentType, sizeBytes, optional etag, lastModified, optional
  tenantId), `signedUrlRequestSchema` (key, operation: `get` / `put`, expiresInSeconds capped at 7
  days, optional contentType + contentLength for PUT pre-signing), and `signedUrlSchema` (url,
  expiresAt, optional headers). The key regex together with a traversal refine blocks the canonical
  `..` directory escape and the empty-segment double-slash escape at the type-system boundary.
- **Port** — `@repo/infrastructure/storage.ts` exports `ObjectStorage` with five Effect-typed
  methods: `put(key, body, options)`, `get(key) → { body, metadata }`, `head(key) → metadata`,
  `delete(key)`, `signUrl(request) → { url, expiresAt, headers? }`. The body is `Uint8Array`
  (universal — Node `Buffer` extends it, browsers expose it natively).
- **Adapters** —
  - `noopObjectStorage` — `put` / `get` / `head` / `signUrl` reject with `UNAVAILABLE` /
    `NOT_FOUND`; `delete` is silent. Solo default; the lane is inert until a real provider is wired.
  - `createMemoryObjectStorage()` — in-process Map of `{ body, metadata }` records, monotonically
    incrementing `etag` for write ordering, `signUrl` returns a `mem://` URL so tests can assert "a
    signed URL was issued" without a real signer.

## Consequences

- **Benefits**:
  - Application code that calls `storage.put(key, bytes, { contentType })` lands a stable shape on
    day one. Swapping `noopObjectStorage` for the AWS SDK / R2 SDK / GCS client / Azure SDK is a
    wiring change, not a refactor of every uploader.
  - Tests for any handler that stores or fetches a blob can use `createMemoryObjectStorage` and
    assert on round-trip bytes — no LocalStack, no MinIO container, no provider sandbox in CI.
  - The key schema + traversal refine catches the most common upload- handler bug class
    (`uploads/${userInput}` with `userInput = "../../etc/passwd"`) at the contract boundary, not at
    the storage layer.
  - `tenantId` flows through the metadata (per ADR
    [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md)), so per-tenant bucket
    prefixes / lifecycle rules / audit attribution work without retrofitting.
- **Costs**:
  - The contract is buffered (`Uint8Array`). For multi-GB uploads (video transcode, scientific
    datasets) a streaming variant is needed. The ADR explicitly notes that real adapters extend with
    their own stream methods (`putStream`, `getStream`); the contract intentionally does not
    normalize them because S3 multipart upload, GCS resumable upload, and Azure block blob have
    meaningfully different ergonomics.
  - The 7-day signed-URL ceiling matches AWS's pre-signed URL maximum; forks targeting GCS or Azure
    with longer expiry windows have to relax the schema. Worth the loud failure for the 99% case.
- **Risks / open questions**:
  - The `signUrl` semantics differ subtly across providers — S3 supports PUT pre-sign with
    content-length-range, R2 supports it with different metadata, Azure uses SAS tokens with
    different scope grammar. The contract surfaces the core fields (operation, expiry, contentType,
    contentLength) but adapters may have to lossy-down additional provider-specific options. A
    future ADR may add a `provider-specific` opaque field if a real consumer needs it.
  - Multipart upload, lifecycle rules, server-side encryption keys, and bucket-level CORS / IAM are
    all out of scope. Those are provider-shaped operational concerns; the contract is for the
    application path.

## Alternatives considered

- **Ship the AWS S3 SDK as the default**: rejected per ADR 0001. Forces AWS env (region, credentials
  chain) on every fork, even forks that prefer R2 or GCS or self-hosted MinIO.
- **Body as `ReadableStream<Uint8Array>` instead of `Uint8Array`**: rejected for the contract layer.
  Streams add complexity (back- pressure, error propagation, cancellation) the memory adapter would
  have to mock; for the small-file case (the 90% pattern), buffered bytes are simpler and
  debugger-friendlier. Real adapters extend with stream variants.
- **Reuse `apps/api/src/uploads/` filesystem storage as the default**: no such directory exists, but
  the temptation might. Rejected: local filesystem doesn't survive container restarts, doesn't
  replicate across instances, and forces every fork's deployment model to handle "where do uploads
  live in production?" as a separate question.
- **Embed signing logic in the contract**: rejected. Each provider's signing algorithm is different
  (AWS Sig V4, GCS HMAC, Azure SAS). The contract describes _what_ is requested; the adapter does
  the signing.

## References

- `packages/contracts/src/storage.ts` — schemas + types
- `packages/infrastructure/src/storage.ts` — `ObjectStorage` port + memory + noop
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — `tenantId` carries through
- AWS S3 pre-signed URL constraints:
  <https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html>
- Cloudflare R2 S3 compatibility: <https://developers.cloudflare.com/r2/api/s3/api/>
