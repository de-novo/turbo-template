# Enable object storage

The template ships the object-storage contract (per ADR
[0009](../adr/0009-object-storage-contract.md)) and a wired `StorageModule` that provides
`OBJECT_STORAGE` defaulting to `noopObjectStorage`. The lane is inert until you (1) write a provider
adapter and (2) call `storage.put` / `storage.get` / `storage.signUrl` from handlers that store or
fetch blobs.

## When this applies

Your product needs to store opaque files: user-uploaded avatars / documents, generated PDFs,
exported CSVs, transcoded media, scanned files. Anything that doesn't fit the relational DB and
shouldn't go through it.

If your fork is purely metadata + relational data (no file uploads, no generated artifacts), leave
`noopObjectStorage` in place.

## Step 1 — Pick a provider

| Provider             | Trade-off                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| AWS S3               | The reference. Most mature SDK, deepest feature set (Object Lock, lifecycle, versioning). Most expensive. |
| Cloudflare R2        | S3-compatible API. No egress fees. Fewer features (no Object Lock yet).                                   |
| Google Cloud Storage | First-class on GCP. Resumable uploads, signed URLs with content-length-range.                             |
| Azure Blob Storage   | First-class on Azure. SAS tokens with rich scoping.                                                       |
| MinIO (self-hosted)  | S3-compatible, runs on your hardware. Right for air-gapped / regulated deploys.                           |
| Backblaze B2         | S3-compatible. Cheapest at rest; cheaper egress than S3.                                                  |

For most products: **R2** if you don't need Object Lock, **S3** if you do (or if you're already on
AWS).

## Step 2 — Implement `ObjectStorage`

For S3 / R2 (S3-compatible) — first add `S3_BUCKET`, `S3_REGION`, and optional `S3_ENDPOINT` to
`packages/env/src/apps/api.ts` and the env example files (per [`add-env-key.md`](./add-env-key.md)),
then create `apps/api/src/storage/s3-object-storage.ts`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  PutOptions,
  ObjectStorage,
  SignedUrl,
  SignedUrlRequest,
  StorageObjectKey,
  StorageObjectMetadata,
} from "@repo/infrastructure";
import { AppError } from "@repo/platform";
import { Effect } from "effect";
import { API_ENV, type ApiEnv } from "../api-env.module.js";

@Injectable()
export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.bucket = env.S3_BUCKET ?? "";
    if (!this.bucket) {
      throw new AppError({ code: "INTERNAL", message: "S3_BUCKET missing." });
    }
    this.client = new S3Client({
      region: env.S3_REGION ?? "us-east-1",
      ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    });
  }

  put(key: StorageObjectKey, body: Uint8Array, options: PutOptions) {
    return Effect.tryPromise({
      try: async () => {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: options.contentType,
            ...(options.tenantId ? { Metadata: { "tenant-id": options.tenantId } } : {}),
          }),
        );
        const head = await this.client.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        return this.toMetadata(key, head, options.tenantId);
      },
      catch: (cause) => new AppError({ code: "UNAVAILABLE", message: "put failed.", cause }),
    });
  }

  get(key: StorageObjectKey) {
    return Effect.tryPromise({
      try: async () => {
        const result = await this.client.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const body = await result.Body!.transformToByteArray();
        const metadata = this.toMetadata(key, result, result.Metadata?.["tenant-id"]);
        return { body, metadata };
      },
      catch: (cause) => new AppError({ code: "NOT_FOUND", message: `get ${key} failed.`, cause }),
    });
  }

  head(key: StorageObjectKey) {
    return Effect.tryPromise({
      try: async () => {
        const result = await this.client.send(
          new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        return this.toMetadata(key, result, result.Metadata?.["tenant-id"]);
      },
      catch: (cause) => new AppError({ code: "NOT_FOUND", message: `head ${key} failed.`, cause }),
    });
  }

  delete(key: StorageObjectKey) {
    return Effect.tryPromise({
      try: async () => {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      },
      catch: (cause) => new AppError({ code: "UNAVAILABLE", message: "delete failed.", cause }),
    });
  }

  signUrl(request: SignedUrlRequest) {
    return Effect.tryPromise({
      try: async (): Promise<SignedUrl> => {
        const command =
          request.operation === "get"
            ? new GetObjectCommand({ Bucket: this.bucket, Key: request.key })
            : new PutObjectCommand({
                Bucket: this.bucket,
                Key: request.key,
                ...(request.contentType ? { ContentType: request.contentType } : {}),
                ...(request.contentLength ? { ContentLength: request.contentLength } : {}),
              });
        const url = await getSignedUrl(this.client, command, {
          expiresIn: request.expiresInSeconds,
        });
        return {
          url,
          expiresAt: new Date(Date.now() + request.expiresInSeconds * 1000).toISOString(),
        };
      },
      catch: (cause) => new AppError({ code: "UNAVAILABLE", message: "signUrl failed.", cause }),
    });
  }

  private toMetadata(
    key: StorageObjectKey,
    head: { ContentType?: string; ContentLength?: number; ETag?: string; LastModified?: Date },
    tenantId?: string,
  ): StorageObjectMetadata {
    return {
      key,
      contentType: head.ContentType ?? "application/octet-stream",
      sizeBytes: head.ContentLength ?? 0,
      ...(head.ETag ? { etag: head.ETag } : {}),
      lastModified: (head.LastModified ?? new Date()).toISOString(),
      ...(tenantId ? { tenantId: tenantId as never } : {}),
    };
  }
}
```

For GCS / Azure Blob, swap the SDK and adjust the metadata mapping — the contract shape is the same.

## Step 3 — Swap the `StorageModule` provider

```ts
import { Module } from "@nestjs/common";
import { ApiEnvModule } from "../api-env.module.js";
import { OBJECT_STORAGE } from "./storage.tokens.js";
import { S3ObjectStorage } from "./s3-object-storage.js";

@Module({
  imports: [ApiEnvModule],
  providers: [S3ObjectStorage, { provide: OBJECT_STORAGE, useExisting: S3ObjectStorage }],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
```

The SDK credential chain can still use platform-provided credentials (IAM role / SSO / CI secret
mounts), but application-owned storage settings should enter through `@repo/env`.

## Step 4 — Use from handlers

Two common patterns: **direct upload** (small files, server proxies) and **presigned URL** (large
files, browser uploads directly).

### Direct upload (small files)

```ts
@Post("avatar")
async upload(@UploadedFile() file: { buffer: Buffer; mimetype: string }, @CurrentUser() user) {
  const key = `avatars/${user.id}/${crypto.randomUUID()}.png`;
  const metadata = await runWorkflow(
    this.storage.put(key, new Uint8Array(file.buffer), {
      contentType: file.mimetype,
      tenantId: getTenantContext()?.tenantId,
    }),
  );
  return { ok: true, data: { key: metadata.key } };
}
```

### Presigned URL (large files, browser uploads)

```ts
@Post("uploads/presign")
async presign(@Body() body: { contentType: string; contentLength: number }, @CurrentUser() user) {
  const key = `uploads/${user.id}/${crypto.randomUUID()}`;
  const signed = await runWorkflow(
    this.storage.signUrl({
      key,
      operation: "put",
      expiresInSeconds: 300,
      contentType: body.contentType,
      contentLength: body.contentLength,
    }),
  );
  return { ok: true, data: { key, ...signed } };
}
```

The browser then `PUT`s directly to the signed URL — your API doesn't see the bytes, freeing it from
buffering uploads.

## Step 5 — Test against the memory storage

`createMemoryObjectStorage` round-trips put → get → head → delete:

```ts
import { createMemoryObjectStorage } from "@repo/infrastructure";

const memoryStorage = createMemoryObjectStorage();
const moduleRef = await Test.createTestingModule({
  controllers: [AvatarController],
  providers: [{ provide: OBJECT_STORAGE, useValue: memoryStorage }],
}).compile();

test("upload stores the file", async () => {
  await request(server).post("/avatar").attach("file", Buffer.from("png-bytes"), "a.png");

  const fetched = await Effect.runPromise(memoryStorage.head("avatars/u-1/..."));
  expect(fetched.contentType).toBe("image/png");
});
```

`signUrl` returns a `mem://` URL in tests so the assertion is "a URL was issued" without a real
signer.

## Step 6 — Remove the deferred-capabilities entry

`docs/capabilities.md` carries a **Real object storage provider** bullet under "Deferred
capabilities". Delete it once activated.

## Step 7 — Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test

# Local development: MinIO via docker-compose, or a dev S3 bucket
export S3_BUCKET=my-fork-uploads-dev
export S3_REGION=us-east-1
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
pnpm dev:api

# Direct upload:
curl -F "file=@/path/to/image.png" https://api.fullstack-typescript-template.localhost/avatar

# Presigned upload:
curl -s -X POST https://api.fullstack-typescript-template.localhost/uploads/presign \
  -d '{"contentType":"image/png","contentLength":1024}' \
  -H 'content-type: application/json' \
  | jq -r .data.url \
  | xargs -I {} curl -X PUT --data-binary @/path/to/image.png {}

# List bucket contents:
aws s3 ls s3://$S3_BUCKET/uploads/
```

## Common pitfalls

- **Using filesystem storage by accident** — local `fs.writeFile` to the API container is tempting
  for "just a quick avatar upload" but doesn't survive container restarts and doesn't replicate. Use
  the contract from day one even if the backend is MinIO on dev.
- **Buffering large uploads through the API** — the direct-upload pattern works for ~10MB. Beyond
  that, switch to presigned uploads so the browser hits the storage directly.
- **Forgetting `..` traversal protection** — the contract's `storageObjectKeySchema` blocks this,
  but only if you parse user input through the schema. Don't construct keys from raw user input
  without validation.
- **Public buckets** — production deploys keep buckets private and serve via signed URLs. Public
  buckets are appropriate only for static-asset delivery (think CDN-backed image hosting), not for
  user uploads.
- **Per-tenant prefixing missing** — once multi-tenancy is activated (per
  [`enable-multi-tenancy.md`](./enable-multi-tenancy.md)), keys should carry the tenant prefix
  (`tenants/${tenantId}/...`). Without it, lifecycle rules and bucket-level breach scoping become
  hard.
- **Lifecycle rules off** — uploads accumulate forever without an S3 lifecycle policy. Decide
  retention (90 days for failed uploads, N years for primary content) and configure on the bucket.

## References

- ADR [0009 — Object storage contract](../adr/0009-object-storage-contract.md)
- `apps/api/src/storage/storage.module.ts` — wiring
- `packages/contracts/src/storage.ts` — `StorageObjectKey`, `StorageObjectMetadata`,
  `SignedUrlRequest`, `SignedUrl`
- `packages/infrastructure/src/storage.ts` — `ObjectStorage` port + `noopObjectStorage` +
  `createMemoryObjectStorage`
- AWS SDK v3 S3 docs:
  <https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html>
- Cloudflare R2 docs: <https://developers.cloudflare.com/r2/>
