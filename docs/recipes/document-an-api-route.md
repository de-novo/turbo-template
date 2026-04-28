# Document an API route

When you add or change a route in `apps/api/src/<area>/`, update the matching file in `docs/api/` in
the **same PR**. There is no automated drift gate — code review is the enforcement mechanism (per
ADR [0011 — API documentation in Markdown](../adr/0011-api-docs-in-markdown.md)).

## When this applies

Any change that touches the public HTTP surface of `apps/api`:

- Adding a new route (new method + path).
- Renaming an existing route or changing its path.
- Changing the request shape (body / query / headers consumed).
- Changing the response shape (success or error).
- Changing the auth posture (added a guard, dropped a guard).
- Changing the throttle posture (added `@SkipThrottle`, added a per-route override).
- Adding or removing an error code the route may emit.

## Where the docs live

| Area                                          | Doc file                                    |
| --------------------------------------------- | ------------------------------------------- |
| New domain module (`/orders`, `/posts`, etc.) | New file: `docs/api/<resource>.md`          |
| Existing notes / auth / health-and-metrics    | Update the matching `docs/api/*.md`         |
| Better Auth's `/api/auth/*` (rare)            | Update [`docs/api/auth.md`](../api/auth.md) |

The canonical example is [`docs/api/notes.md`](../api/notes.md); copy its structure for new files.

## Step-by-step

1. **Land the route change in `apps/api/`** as usual — controller, service, test. The contract goes
   in `packages/contracts/src/<resource>.ts` (Zod schema is the runtime source of truth).
2. **Edit the matching `docs/api/<resource>.md`:**
   - Add / update the row in the routes table (method, path, status, auth, throttle, request schema,
     response schema).
   - Update the **Errors** table if the route now emits a new error code (or stops emitting one).
   - Update the **Auth posture** section if the route's guard coverage changed.
   - Update the **Curl** block to reflect the new shape if a human-readable example would mislead
     with the old form.
3. **Sanity-check the schema links.** Each schema mentioned in the docs should resolve to a symbol
   in `packages/contracts/src/<resource>.ts`. If you renamed
   `createNoteBodySchema → newNoteBodySchema`, both the controller import and the docs link have to
   move together.
4. **Land in one PR.** Code reviewers are looking for: code-change diff in `apps/api/` +
   `packages/contracts/` AND a corresponding diff in `docs/api/`. PRs that change the API surface
   but not the docs should be flagged.

## When to start a new file

- **New file** when you introduce a new logical resource group: `docs/api/orders.md`,
  `docs/api/billing.md`. Add it to the index in [`docs/api/README.md`](../api/README.md).
- **Update existing** when you add another route to an existing resource: a new
  `POST /notes/:id/share` belongs in `docs/api/notes.md`, not a separate file.

The boundary between "extends an existing surface" and "deserves its own file" is judgment — err
toward fewer files. A doc that grows past ~300 lines is a sign to split.

## What you don't need to document

- Internal job payloads, queue messages, outbox events. Those are documented in
  `@repo/contracts/<area>.ts` directly (the schema is the documentation).
- Better Auth per-route detail. Link to the
  [Better Auth API reference](https://www.better-auth.com/docs/concepts/api) rather than duplicating
  it.
- `/health/live`, `/health/ready`, `/metrics` shape unless you change the underlying behavior. The
  doc in [`docs/api/health-and-metrics.md`](../api/health-and-metrics.md) is stable.

## Why no codegen?

ADR [0011](../adr/0011-api-docs-in-markdown.md) explains the trade. Short version: the surface size
for a starter template doesn't justify maintaining an OpenAPI generator + a Scalar UI in production.
Hand- authored MD lives in the repo, gets PR review, and survives without runtime endpoints. Forks
targeting a public consumer-facing API should revisit and add `zod-openapi` (Zod 4 native) at build
time.
