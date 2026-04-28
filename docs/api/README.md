# API documentation

Hand-authored Markdown documents for every public route surface in `apps/api`. The runtime source of
truth for request / response shapes is the Zod schema in `@repo/contracts/<resource>.ts` — the docs
link back to the schema source so a reader who needs the exact definition is one click away. See ADR
[0011 — API documentation in Markdown](../adr/0011-api-docs-in-markdown.md) for why this lane
replaced the previous OpenAPI surface.

## Index

| File                                             | Surface                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| [notes.md](./notes.md)                           | Reference domain module — full CRUD, no auth required (intentionally — see file). |
| [auth.md](./auth.md)                             | Better Auth `/api/auth/*` and the `/me` protected reference route.                |
| [health-and-metrics.md](./health-and-metrics.md) | `/health/live`, `/health/ready`, `/health`, `/metrics`. Probes + Prometheus.      |

## Format convention

Each file follows the same structure so future readers can scan predictably:

1. **Header** — one-paragraph summary, link to the controller in `apps/api/src/<area>/`, link to the
   Zod schema in `@repo/contracts/<resource>.ts` (when applicable).
2. **Routes table** — one row per route with: method, path, auth posture, throttle posture, request
   shape (linked), response shape (linked).
3. **Per-route sections** (when needed) — error codes the route emits, notable status codes,
   idempotency expectations, rate-limit overrides.
4. **Operational notes** — anything that is true at runtime but not visible in the controller (e.g.
   "rate limit overrides apply per IP", "the route is exempt from the global throttle via
   `@SkipThrottle`").

Keep examples minimal — one `curl` invocation per representative verb, not a full SDK example. The
contract is the source of truth; the docs are a navigation surface, not a tutorial.

## When to update

When you add or change a route in `apps/api/src/<area>/`, update the matching
`docs/api/<resource>.md` in the **same PR**. The recipe at
[docs/recipes/document-an-api-route.md](../recipes/document-an-api-route.md) documents the
convention. There is no automated drift gate — review is the enforcement mechanism (per ADR 0011's
"Costs" section).

## What's not here

- **`/api/auth/*` per-route detail.** Better Auth owns the surface; refer to its docs (linked from
  [auth.md](./auth.md)).
- **Internal protocol surfaces** (database queries, job-queue payloads, outbox event shapes). Those
  are documented in `@repo/contracts/<area>.ts` directly — they are not HTTP routes.
- **Generated SDKs.** This template does not ship a generated client.
  `@repo/clients/createFetchClient` plus `import { noteSchema } from "@repo/contracts"` is the
  typed-client story.
