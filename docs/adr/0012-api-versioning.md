# 0012 — API versioning: defer until the first breaking change

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Every starter template eventually faces a versioning decision. Mount routes at `/v1/notes` from day
one and the convention is established; mount at `/notes` and the first breaking change forces a
versioning strategy onto a codebase that's never had one. Common strategies:

- **URL versioning** — `/v1/notes`, `/v2/notes`. Most discoverable; every load balancer, every
  gateway, every browser DevTools tab surfaces it. Downside: forces all consumers to write `/v1/...`
  even when there is no `v2` to choose between.
- **Header versioning** — `Accept: application/vnd.api+json; version=1`. Hides the version from
  URLs. Downside: invisible to CDNs / curl reproductions / ad-hoc browser tabs; every client has to
  know to send the header.
- **Query-param versioning** — `/notes?v=1`. Visible but breaks URL caching (different `?v=` values
  are different cache keys for the same resource). Worst of both worlds.
- **No versioning** — break things in place. Acceptable for an internal API with one consumer;
  unacceptable for anything with an external client lifecycle.

The template currently has no `/v1/` prefix. The reference modules mount at `/notes`, `/me`,
`/health/*`, `/metrics`. There has never been a breaking change to defer, and forcing a `/v1/`
prefix on consumers today is paying ceremony for zero benefit.

## Decision

Ship no version prefix today. Introduce versioning **only** when the first breaking change to a
route requires it. When that happens, use **URL versioning** with a deprecation overlap.

Concretely, when the first breaking change lands:

1. **The new shape lives at the new path.** If `notes.create` adds a required `tenantId` field, the
   new route is `POST /v1/notes` (returning the new shape) — `POST /notes` continues to serve the
   old shape for the deprecation window.
2. **Both routes coexist for a published deprecation window** — minimum 90 days from announcement.
   The MD doc (`docs/api/notes.md`) carries a **Deprecated** column on the route table and the
   cutover date in the resource header.
3. **The old route is removed** after the window. The MD doc keeps a "Removed YYYY-MM-DD" entry in
   the change log section so old client implementations have a paper trail.

Routes that have not yet had a breaking change stay at the unprefixed path. Mixed `/notes` (stable)
and `/v1/orders` (post- break) coexisting is fine; the prefix communicates "this resource has been
versioned at least once".

Once a resource has been versioned, all _future_ breaking changes to it bump the prefix (`/v1/notes`
→ `/v2/notes`). The MD doc carries both rows during the overlap window.

## Consequences

- **Benefits**:
  - Consumers writing today against `/notes` are not forced to change clients on a future date when
    no breaking change has actually landed.
  - The decision is loud when it happens — the diff that adds `/v1/notes` alongside `/notes` is
    impossible to miss in PR review.
  - Mixed-version cohort (some resources at `/`, some at `/v1`) is acceptable; clients dealing with
    the API see the URL pattern and know the resource has stable history.
  - URL versioning is the format every operational tool understands — Datadog HTTP metric labels,
    CDN cache rules, ALB routing, NGINX upstream rules, log greppability. No transport surprises.
- **Costs**:
  - The day the first breaking change lands, the API has to maintain two paths (`/notes` and
    `/v1/notes`) for the overlap window. The handler is dual-pathed: read the body on either path,
    project to the appropriate response shape.
  - The MD doc has to grow a "Deprecated" column on routes that have a successor. The recipe at
    [`docs/recipes/document-an-api-route.md`](../recipes/document-an-api-route.md) will need a
    follow-up section when this becomes real.
- **Risks / open questions**:
  - The deprecation window length (90 days) is a starting heuristic. Real consumer relationships
    (paid API, vendor partner) may require 180 or 365 days; internal-only deployments may compress
    to 30. The policy here is the floor, not a hard contract.
  - This ADR does not cover _additive_ changes (new optional fields, new endpoints under an existing
    resource). Those don't require versioning — add them in place. Versioning kicks in only for
    breaking changes (removed field, type change, semantic change).
  - Better Auth's `/api/auth/*` is owned by Better Auth; their versioning policy is theirs. The MD
    doc at [`docs/api/auth.md`](../api/auth.md) links to their reference rather than enumerating
    routes.

## Alternatives considered

- **Mount `/v1/` from day one**: rejected. Forces consumers to write `/v1/...` for zero benefit when
  no `/v2` exists — a tax on every current consumer to optimize for a future one that may never need
  to make the choice.
- **Header versioning (`Accept: application/vnd.api+json; version=1`)**: rejected. Hides the version
  from URL-aware tools (CDN cache rules, curl reproductions, browser DevTools tabs, ALB / API
  Gateway logging). Easy to forget on a client and have it silently pin to the wrong default. URL is
  the more transparent channel.
- **Query-parameter versioning (`/notes?v=1`)**: rejected. Breaks URL caching — the same logical
  resource fragments across cache keys. Adds a query parameter every client has to remember to set.
- **No versioning ever — break in place with consumer notifications**: rejected for any deployment
  with an external client population. Acceptable for an internal, single-consumer API if the
  consumer is willing to deploy in lockstep; not the template's default audience.
- **Date-based versioning (`/2026-04-28/notes`, à la AWS)**: rejected for a small-team template.
  Requires consumers to remember a date string they may not have written down; the AWS pattern is
  built on internal deployment processes most teams don't have.

## References

- `docs/api/<resource>.md` — current MD docs (will grow a deprecation column when this ADR's
  strategy is exercised).
- `docs/recipes/document-an-api-route.md` — convention for keeping the docs in sync with code
  changes.
- ADR [0011 — API documentation in Markdown](./0011-api-docs-in-markdown.md) — parent ADR
  establishing where deprecation history lives.
- Stripe's "API upgrades" pattern as an industry reference for date-based versioning:
  <https://stripe.com/docs/upgrades> (chosen _against_ in the alternatives list above; included for
  context).
