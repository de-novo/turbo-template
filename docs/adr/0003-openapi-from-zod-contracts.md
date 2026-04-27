# 0003 — OpenAPI from Zod contracts via z.toJSONSchema

- **Status**: Accepted
- **Date**: 2026-04-26

## Context

The API needs a published, machine-readable contract so that web/desktop/mobile clients,
external consumers, and humans can browse routes without reading the NestJS controllers.
We already maintain Zod schemas in `@repo/contracts` (request, response, and error envelope
shapes) — those are the source of truth for runtime validation, and we want a single source
of truth for the documented contract too. The remaining choice is *how* to project the Zod
schemas into OpenAPI.

The first attempt used `@asteasolutions/zod-to-openapi`. It works on Zod 3 by patching
`ZodType.prototype.openapi`, but on Zod 4 the class hierarchy was reorganized: object/string/etc.
schemas no longer inherit from `ZodType.prototype` directly, so the prototype patch never
reaches schema instances and `register()` throws `zodSchema.openapi is not a function` at
runtime. Working around the library's Zod 4 expectations would mean either pinning to Zod 3
or vendoring the patching logic — both costs we don't want to take on for a documentation
artifact.

## Decision

Generate the OpenAPI 3.1 document at request time using **Zod 4's built-in
`z.toJSONSchema(schema, { target: "draft-2020-12" })`** for the schema bodies, and a small
hand-written envelope (`paths`, `components.schemas`, `tags`, `info`, `servers`) that mirrors
the controllers. The generator lives in `apps/api/src/openapi/openapi.config.ts` and is served
from `OpenApiController` at `GET /openapi.json`. A Scalar UI is mounted at `GET /docs` via the
raw Express adapter in `apps/api/src/main.ts` and reads from `/openapi.json`.

A unit test (`openapi.test.ts`) asserts that the generated `Note` schema is byte-identical to
`z.toJSONSchema(noteSchema)` — so contract drift between `@repo/contracts` and the served doc
fails CI.

## Consequences

- **Benefits**:
  - Zero third-party dependency for schema → JSON Schema conversion. `z.toJSONSchema` ships
    with Zod 4 and produces draft-2020-12, which OpenAPI 3.1 accepts directly.
  - The contracts package stays the single source of truth for request/response shapes. Adding
    a field to `noteSchema` propagates to `/openapi.json` on the next request — no codegen step.
  - Scalar UI gives a usable, branded reference page out of the box.
- **Costs**:
  - The `paths` table is hand-authored. When a controller route is added, the generator must
    be updated. We accept this as a deliberate review surface — adding routes is rare and the
    surface is small enough to keep readable.
  - `z.toJSONSchema` produces draft-2020-12 features (e.g. `exclusiveMinimum` as number) that
    older OpenAPI tooling sometimes flags. We target OpenAPI 3.1 specifically because it
    aligns with draft-2020-12; downgrading to 3.0 would require post-processing.
- **Risks / open questions**:
  - If the Zod 4 → JSON Schema mapping changes upstream, the synced-schemas test will fail
    loudly. That's the desired behavior (we don't want silent drift) but it does couple our
    CI to Zod's mapping.
  - Better Auth's `/api/auth/*` surface is documented as a single opaque path. If consumers
    need a richer auth contract, they should follow Better Auth's own `/api/auth/reference`
    page rather than expecting us to enumerate it.

## Alternatives considered

- **`@asteasolutions/zod-to-openapi`**: rejected because the 8.5 release's prototype-patching
  approach (`extendZodWithOpenApi`) does not reach Zod 4 schema instances. Pinning Zod to 3.x
  would regress the rest of the codebase, and the library's `.meta()` path still calls
  `.openapi()` internally on register, so the workaround is incomplete.
- **`zod-openapi` (singular package)**: a viable alternative with native Zod 4 support, but
  it adds a runtime dependency to do something Zod 4 already does. We can adopt it later if
  the hand-authored envelope becomes a real maintenance cost.
- **Build-time OpenAPI codegen**: rejected because it adds a sync step to the dev loop.
  Request-time generation is cheap (pure JSON) and the doc never goes stale relative to the
  Zod schemas.
- **Decorators on NestJS controllers (`@nestjs/swagger`)**: rejected because it duplicates the
  contract surface — once in `@repo/contracts` for runtime validation and once in decorator
  metadata for docs. We want one place to change.

## References

- `apps/api/src/openapi/openapi.config.ts` — generator
- `apps/api/src/openapi/openapi.controller.ts` — `/openapi.json` route
- `apps/api/src/openapi/openapi.test.ts` — drift guard
- `apps/api/src/main.ts` — `/docs` Scalar mount
- Zod 4 `toJSONSchema`: <https://zod.dev/json-schema>
- OpenAPI 3.1 / JSON Schema 2020-12 alignment: <https://www.openapis.org/blog/2021/02/16/migrating-from-openapi-3-0-to-3-1-0>
