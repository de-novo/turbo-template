# @repo/db

## Purpose

Drizzle ORM schema, PostgreSQL client factory, env parser, and health
check helpers. Owned exclusively by services that hold a database
connection (the API by default; an auth-service in Pattern C MSA).

## Public surface

Re-exports from `src/index.ts`:

- `createDatabaseClient({ connectionString, pool? }) -> { db, pool, close() }`
- `databaseEnvSchema`, `parseDatabaseEnv` — `DATABASE_URL` validation.
- Health helpers from `./health.js`.
- `schema` namespace — every Drizzle table for the workspace
  (auth-users, auth-sessions, auth-accounts, auth-verifications,
  auth-sso-providers, notes, system-events).

## Allowed dependencies

- Imports: `drizzle-orm`, `pg`, `zod`.
- Imported by: `@repo/auth-server` (Better Auth adapter), `apps/api` (or
  any other DB-owning service).

## Usage

```ts
import { createDatabaseClient } from "@repo/db";

const { db, close } = createDatabaseClient({ connectionString: env.DATABASE_URL });
// ...
await close();
```

## Drizzle commands

Run from the repo root:

```bash
pnpm db:generate   # generate SQL migrations from schema
pnpm db:migrate    # apply pending migrations against DATABASE_URL
pnpm db:studio     # open Drizzle Studio
```

`db:generate` works without a live database. `db:migrate` and `db:studio`
require `DATABASE_URL` to point at a reachable PostgreSQL instance — the
defaults in `.env.example` match the local `docker-compose.yml`.

## Tests

```bash
pnpm --filter @repo/db test
```

Files: `src/env.test.ts`.
