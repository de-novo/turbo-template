# Notes

Reference domain module — uses the canonical contract → controller → service → test layout. Real
product modules should mirror this shape.

- **Controller:**
  [`apps/api/src/notes/notes.controller.ts`](../../apps/api/src/notes/notes.controller.ts)
- **Service:** [`apps/api/src/notes/notes.service.ts`](../../apps/api/src/notes/notes.service.ts)
- **Schemas:** [`packages/contracts/src/notes.ts`](../../packages/contracts/src/notes.ts)
  (`noteSchema`, `createNoteBodySchema`, `updateNoteBodySchema`, `listNotesQuerySchema`)

Storage is in-process for the reference; a real fork swaps the service for Drizzle queries against
the `@repo/db` client.

## Routes

| Method | Path         | Status | Auth | Throttle | Request                                        | Response                                         |
| ------ | ------------ | ------ | ---- | -------- | ---------------------------------------------- | ------------------------------------------------ |
| GET    | `/notes`     | 200    | none | global   | `listNotesQuerySchema` (query: page, pageSize) | `apiResponseSchema(paginatedSchema(noteSchema))` |
| GET    | `/notes/:id` | 200    | none | global   | —                                              | `apiResponseSchema(noteSchema)`                  |
| POST   | `/notes`     | 201    | none | global   | `createNoteBodySchema`                         | `apiResponseSchema(noteSchema)`                  |
| PUT    | `/notes/:id` | 200    | none | global   | `updateNoteBodySchema`                         | `apiResponseSchema(noteSchema)`                  |
| DELETE | `/notes/:id` | 204    | none | global   | —                                              | empty body                                       |

Global throttle: 100 req / min / IP via `@nestjs/throttler` (defined in
`apps/api/src/app.module.ts`).

## Errors

The shared envelope (`apiFailureSchema` / `publicErrorSchema`) is used for every error body. Codes
the routes emit:

| Code           | When                                                             |
| -------------- | ---------------------------------------------------------------- |
| `BAD_REQUEST`  | Zod validation failed on body / query (via `ZodValidationPipe`). |
| `NOT_FOUND`    | `:id` does not exist in the in-process store.                    |
| `RATE_LIMITED` | Global 100 req / min / IP throttle exceeded.                     |
| `INTERNAL`     | Unexpected — surfaced via `AppErrorFilter`.                      |

## Auth posture

**None.** The notes module is a reference for the contract → controller → service → test loop and
intentionally does not require authentication. Real product modules pair with
`@AuthenticatedGuard()` and `@CurrentUser()`; see [auth.md](./auth.md) and the recipe at
[docs/recipes/protect-an-api-route.md](../recipes/protect-an-api-route.md).

## Curl

```bash
# List
curl https://api.fullstack-typescript-template.localhost/notes?page=1&pageSize=20

# Create
curl -X POST https://api.fullstack-typescript-template.localhost/notes \
  -H 'content-type: application/json' \
  -d '{"title":"hello","body":"first note"}'

# Fetch by id
curl https://api.fullstack-typescript-template.localhost/notes/<id>

# Update
curl -X PUT https://api.fullstack-typescript-template.localhost/notes/<id> \
  -H 'content-type: application/json' \
  -d '{"title":"updated"}'

# Delete
curl -X DELETE -i https://api.fullstack-typescript-template.localhost/notes/<id>
```
