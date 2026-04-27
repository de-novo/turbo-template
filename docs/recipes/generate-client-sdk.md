# Generate a typed client SDK

The API publishes its contract at two endpoints:

- `GET /openapi.json` — the OpenAPI 3.1 document, generated from `@repo/contracts` Zod schemas via
  `z.toJSONSchema` (see ADR [0003](../adr/0003-openapi-from-zod-contracts.md)).
- `GET /docs` — the Scalar UI rendering it.

The template **does not** ship a generated client SDK by default. `@repo/clients` ships a thin
`createFetchClient` plus contract-driven decoding (parse responses through Zod schemas), which is
enough for a small surface and avoids a code-generation step in the dev loop. When the API surface
grows past ~20 endpoints, generating a typed client starts to pay for itself.

This recipe sketches the most common option (`openapi-typescript`) and the trade-offs against the
two alternatives. Pick one, commit to it.

## Option A — `openapi-typescript` + `openapi-fetch` (lightweight)

```bash
pnpm add -Dw openapi-typescript
pnpm add -w openapi-fetch
```

Add a generation script to `packages/clients/package.json`:

```json
{
  "scripts": {
    "sdk:gen": "openapi-typescript http://localhost:4000/openapi.json -o src/generated/api.ts"
  }
}
```

Then in `packages/clients/src/api-client.ts`:

```ts
import createClient from "openapi-fetch";
import type { paths } from "./generated/api.js";

export const apiClient = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_URL });
// Usage: apiClient.GET("/notes", { params: { query: { page: 1 } } })
```

Trade-offs:

- ✅ Tiny runtime (`openapi-fetch` is a few kB).
- ✅ Compile-time route checking — wrong path names fail typecheck.
- ❌ Generation is a manual step (run `pnpm sdk:gen` against a running API or against
  `apps/api/src/openapi/openapi.config.ts` exported as JSON).
- ❌ No runtime validation — pair with `@repo/contracts` Zod schemas if you want both compile-time
  and runtime safety.

## Option B — `@hey-api/openapi-ts` (more opinionated)

```bash
pnpm add -Dw @hey-api/openapi-ts
```

Generates a typed SDK with method-style calls (`api.notes.list({ page: 1 })`) plus optional Zod or
Valibot runtime validators. Heavier output, but ergonomic.

Trade-offs:

- ✅ Ergonomic: method-style calls, batched fetch options, optional runtime validation.
- ❌ Larger output. Adds ~30 kB minified for a small surface.
- ❌ Couples the codebase to hey-api's conventions; harder to swap later.

## Option C — keep `createFetchClient` (no codegen)

If the surface is small and `@repo/contracts` already has Zod schemas, you can keep going without
codegen:

```ts
import { createFetchClient } from "@repo/clients";
import { noteSchema } from "@repo/contracts";

const client = createFetchClient({ baseUrl: env.NEXT_PUBLIC_API_URL });
const note = noteSchema.parse(await client.get("/notes/" + id));
```

Trade-offs:

- ✅ Zero codegen step. The client is the source of truth.
- ❌ Path strings are stringly-typed; no compile-time check that the route exists.

## Recommendation

- < 10 endpoints: stay on Option C.
- 10–30 endpoints: Option A.
- 30+ endpoints across multiple services: Option B (the ergonomics start to matter).

Whichever you pick, run the generator in CI on a running API (or against an exported JSON file) so
the SDK can never silently drift from the served contract.

## Verify

After wiring whichever option you picked:

```bash
pnpm dev:api &                                       # serve /openapi.json
pnpm --filter @repo/clients run sdk:gen              # regenerate
pnpm --filter @repo/clients typecheck
pnpm --filter @repo/web typecheck                    # web should pick up the new types
```
