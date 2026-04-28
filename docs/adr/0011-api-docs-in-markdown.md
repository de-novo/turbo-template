# 0011 — API documentation in Markdown, OpenAPI surface removed

- **Status**: Accepted
- **Date**: 2026-04-28
- **Supersedes**: [0003](./0003-openapi-from-zod-contracts.md)

## Context

ADR [0003](./0003-openapi-from-zod-contracts.md) established a build- free OpenAPI 3.1 document at
`/openapi.json` (generated on the fly from `@repo/contracts` Zod schemas via `z.toJSONSchema`) plus
a Scalar UI at `/docs`. The intent was a single source of truth — the Zod schemas — projected into a
machine-readable contract any consumer could read.

Two practical observations after running with that surface:

1. **No machine consumer materialized.** The template intentionally does not ship a generated client
   SDK (`@repo/clients` is a thin `createFetchClient` plus contract-driven decoding). The recipe for
   generating one (`docs/recipes/generate-client-sdk.md`) was a "do it yourself when the surface
   grows past 20 endpoints" pointer, not a wired-up flow. So the OpenAPI document was being
   maintained primarily for the human-facing Scalar UI.
2. **Scalar UI is one more production surface to defend.** It needed an `EXPOSE_DOCS` env knob, a
   404 path that intentionally hides existence (rather than 401-signaling), a hand-authored `paths`
   table inside `openapi.config.ts` that had to be updated alongside every controller change, and a
   drift-guard test (`openapi.test.ts`) keeping the generator honest. Real value came from a tab a
   developer opened during dev; the production code path was dead weight.

A Markdown surface in `docs/api/<resource>.md` can carry the same information for the human reader
(route list, request/response shapes, error codes, auth posture) at lower carrying cost: it ships in
the repo, gets PR review alongside the code, doesn't need a runtime endpoint, and doesn't need a
build step. The drift risk vs. the contracts is real but is an addressable review concern, not a
type-system concern (the contracts are still the runtime source of truth).

## Decision

Replace the OpenAPI surface with hand-authored Markdown:

- Delete `apps/api/src/openapi/` (module, controller, generator, drift-guard test).
- Drop the `apiReference` Scalar mount in `apps/api/src/main.ts` and remove
  `@scalar/express-api-reference` from `apps/api/package.json` + the workspace catalog.
- Drop `EXPOSE_DOCS` from the API env loader (`packages/env/src/apps/api.ts`) and from any env
  example.
- Drop `docs/recipes/generate-client-sdk.md` (its premise — read from `/openapi.json` — is gone).
  The "type-safe client" story is now "import the response/request schemas directly from
  `@repo/contracts/<resource>` and parse with Zod"; that is enough for the surface size this
  template targets.

Add the Markdown surface:

- `docs/api/README.md` — index + format convention.
- `docs/api/<resource>.md` — one file per logical resource group (`notes.md`, `auth.md`,
  `health-and-metrics.md` to start). Each file carries: the route table (method, path, auth posture,
  throttle), the request body / query / response shape (linked to the
  `@repo/contracts/<resource>.ts` source), the error codes the route emits, and any operational
  notes (rate limit overrides, idempotency expectations).
- `docs/recipes/document-an-api-route.md` — the convention enforcement: when adding or changing a
  route, update the matching `docs/api/` file in the same PR.

The contracts in `@repo/contracts` remain the runtime source of truth unchanged. The Markdown
surface is documentation _of_ the contracts; a reader who wants the Zod schema goes one click to the
source.

## Consequences

- **Benefits**:
  - Production attack surface shrinks: one fewer public endpoint, one fewer dep
    (`@scalar/express-api-reference` ~150KB resolved), one fewer env knob (`EXPOSE_DOCS`), one fewer
    404-vs-401 decision to hold in the head.
  - PR review covers the docs alongside the code change — `git diff` on `docs/api/notes.md` is part
    of the review surface, not a separate "did you remember to update the Scalar UI" check.
  - No more hand-authored `paths` table inside the OpenAPI generator (`openapi.config.ts`) drifting
    from the controller decorators.
  - The drift-guard test is replaced by a review-time human gate. For the template's surface size,
    that's acceptable; for a 200-endpoint API, the right move is to revisit and pick a real
    machine-readable contract (and at that scale the `tspec` / `zod-openapi` ecosystem has matured
    past where it was at ADR 0003 time).
- **Costs**:
  - Drift risk between the Zod contract and the MD docs is real and review-only. The recipe
    documents the convention; the lint gate cannot enforce it. Forks where the API is
    consumer-facing (paid public API, vendor partnership) should keep this in mind and may want to
    re-introduce an OpenAPI surface specifically for the public contract.
  - No browsable Scalar UI for "click around the API in dev." `curl` and the recipe-linked
    `docs/api/<resource>.md` are the replacement. A developer who wants a UI can install Bruno /
    Insomnia / Postman locally.
  - The `Note` schema → `z.toJSONSchema` drift-guard test goes away. If the Zod schema → JSON Schema
    upstream behavior changes, that failure mode is no longer caught here. (The contracts test suite
    still catches changes to the Zod schemas themselves.)
- **Risks / open questions**:
  - This template targets the "starts solo, scales to enterprise" case. The decision is consciously
    biased toward the early-stage end — a 5-person team with a 15-endpoint API genuinely benefits
    from less ceremony. If your fork's first product is a public API consumed by external partners,
    revisit this ADR before launch.
  - Mobile / desktop client codegen (Swagger Codegen, Kotlin client, etc.) requires an OpenAPI
    document. Forks that need that flow should add `zod-openapi` (Zod 4 native, much cleaner than
    the state at ADR 0003) and emit the document at build time, not runtime. The MD docs stay as the
    human surface.

## Alternatives considered

- **Keep OpenAPI alongside MD**: rejected. Two surfaces drift; one of them inevitably becomes a lie.
  The cost of running both is higher than the value of either.
- **Generate MD from Zod schemas at build time**: rejected as premature codegen for this template's
  surface size. A 15-endpoint API can be hand-maintained; a 100-endpoint API should reconsider (and
  at that scale the right move is OpenAPI + Stoplight / Mintlify rather than home-rolled MD
  generation).
- **Use Mintlify / ReadMe.com hosted docs**: rejected. External vendor dependency for a template
  that's supposed to be self- contained, and pricing assumptions ($150+/month for non-trial tiers as
  of 2026-04) bias every fork toward a vendor relationship they may not want.
- **Move the docs into Notion / Confluence**: rejected. Severs the PR-review-time link between code
  change and docs change, which is the entire point of moving to MD-in-repo.

## References

- ADR [0003 — OpenAPI from Zod contracts](./0003-openapi-from-zod-contracts.md) (superseded)
- `docs/api/README.md` — format convention + index
- `docs/api/notes.md` — reference example
- `docs/recipes/document-an-api-route.md` — review-time enforcement
- Removed in this commit: `apps/api/src/openapi/*`, `EXPOSE_DOCS` env key,
  `@scalar/express-api-reference` dep, `docs/recipes/generate-client-sdk.md`.
