# @repo/contracts

## Purpose

Runtime-light Zod schemas and shared types that define the API surface and
cross-cutting envelopes used by every app and package. Imported by both
client and server code; must not depend on Node, browser, ORM, Redis, or
Kafka APIs.

## Public surface

Re-exports from `src/index.ts`:

- `baseEnvSchema` — base for every app's env validator (NODE_ENV, PROJECT_*).
- `ApiResponse<T>`, error envelope, error code enums.
- `idSchema` — opaque ID format used across resources.
- `paginationSchema`, list-response helper.
- `DomainEvent<T>` — payload shape for cross-service events.
- `notes` schemas (`noteSchema`, `noteListResponseSchema`,
  `CreateNoteInput`, `UpdateNoteInput`, `NoteListQuery`) — canonical
  reference for adding new entity contracts.

## Allowed dependencies

- Imports: `zod` only.
- Imported by: every app and most packages (`@repo/clients`,
  `@repo/auth`, `@repo/auth-server`, `@repo/db`, `@repo/platform`,
  `@repo/infrastructure`).

## Usage

```ts
import { baseEnvSchema, type ApiResponse } from "@repo/contracts";
import { z } from "zod";

const envSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(4000),
});
```

## Tests

```bash
pnpm --filter @repo/contracts test
```

Files: `src/env.test.ts`, `src/notes.test.ts`.
