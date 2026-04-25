# @repo/platform

## Purpose

Cross-cutting utilities used by every service: typed `AppError`, Pino
logger factory, env helpers, feature flag registry, time helpers, and
Effect result helpers. Anything that would otherwise be duplicated across
apps belongs here.

## Public surface

Re-exports from `src/index.ts`:

- `AppError` — discriminated error class with `code`, `message`,
  optional `details`.
- `createPinoLogger(options)` — preconfigured Pino instance for workers
  and CLIs (the API uses `nestjs-pino` directly with the same defaults).
- Env helpers from `./env.js`.
- Feature flag key registry (`./feature-flags.js`).
- Logger context shape (`./logger.js`).
- Result helpers (`./result.js`) — Effect-friendly success/failure types.
- Time helpers (`./time.js`).
- Workflow helpers (`./workflow.js`).

## Allowed dependencies

- Imports: `@repo/contracts`, `effect`, `pino`, `pino-pretty`, `zod`.
- Imported by: `@repo/clients`, `@repo/infrastructure`, `apps/api`, and
  any worker.

## Usage

```ts
import { AppError, createPinoLogger } from "@repo/platform";

const logger = createPinoLogger({ service: projectConfig.projectSlug });

throw new AppError({ code: "NOT_FOUND", message: "Note missing" });
```

## Tests

```bash
pnpm --filter @repo/platform test
```

Files: `src/app-error.test.ts`.
