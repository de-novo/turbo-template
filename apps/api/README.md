# apps/api — NestJS

## Purpose

REST API for the product. NestJS 11 on Node 24, ESM throughout.
Authenticated via Better Auth (mounted here in Pattern B), with shared
contracts validated through Zod and errors mapped to a single envelope.

## Stack

- NestJS 11 (`@nestjs/core`, `@nestjs/platform-express`)
- Better Auth via `@repo/auth-server`
- Drizzle + PostgreSQL via `@repo/db`
- Pino logging via `nestjs-pino`; secrets redacted by default
- OpenAPI/Swagger UI at `/docs`

## Dev

```bash
pnpm dev:api                  # http://localhost:4000
```

The dev server uses `tsx watch` (`package.json` script). The OpenAPI UI
is available once boot finishes.

## Build / start

```bash
pnpm --filter @repo/api build
pnpm --filter @repo/api start # node dist/main.js
```

## Env

Validated by `parseApiEnv()` in `src/env.ts` (called from `src/main.ts`,
exits on failure). `BETTER_AUTH_SECRET` must be 32+ chars. Social SSO
providers activate only when both `*_CLIENT_ID` and `*_CLIENT_SECRET` are
set.

## Adding a domain module

Mirror `src/notes/`:

1. Add Zod schemas to `packages/contracts/src/<entity>.ts`.
2. Add Drizzle tables to `packages/db/src/schema/<entity>.ts`.
3. Add NestJS service + controller under `apps/api/src/<entity>/`.
4. Add a typed client at `packages/clients/src/<entity>-client.ts`.
5. Register the module in `apps/api/src/app.module.ts`.

## Allowed dependencies

`@repo/auth`, `@repo/auth-server`, `@repo/contracts`, `@repo/db`,
`@repo/infrastructure`, `@repo/platform`, plus the NestJS ecosystem.

## Tests

```bash
pnpm --filter @repo/api test
```

Files: `src/env.test.ts`.
