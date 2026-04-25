# @repo/clients

## Purpose

Typed HTTP clients for the API. Centralizes envelope handling, error
mapping (`AppError`), header injection, and Zod response validation so
every consumer (web, desktop, mobile, server-to-server) gets the same
semantics for free.

## Public surface

Re-exports from `src/index.ts`:

- `createFetchClient(options) -> { request }` — generic factory. Accepts
  `baseUrl`, optional `getHeaders` callback (auth, request id), optional
  `fetchImpl` for tests/SSR.
- `createNotesClient(fetchClient) -> NotesClient` — canonical reference
  for per-entity clients (list / get / create / update / delete).
- `FetchClient`, `RequestOptions`, `FetchClientOptions`, `NotesClient`
  types.

When you add a new entity, copy the notes client, swap the schemas from
`@repo/contracts`, and register it where consumers need it.

## Allowed dependencies

- Imports: `@repo/contracts`, `@repo/platform`, `zod`.
- Imported by: web, desktop, mobile, and any worker that calls the API.

## Usage

```ts
import { createFetchClient, createNotesClient } from "@repo/clients";

const http = createFetchClient({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  getHeaders: () => ({ "x-request-id": crypto.randomUUID() }),
});

const notes = createNotesClient(http);
const page = await notes.list({ page: 1, pageSize: 20 });
```

## Tests

```bash
pnpm --filter @repo/clients test
```

Files: `src/fetch-client.test.ts`.
