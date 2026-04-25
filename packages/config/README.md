# @repo/config

## Purpose

Single source of truth for project metadata and shared tool configuration.
Reads `project.config.json` at the repo root via static JSON import and
exposes it as a typed const. Also publishes the shared TypeScript and
Biome configurations that the rest of the workspace extends.

## Public surface

From `src/index.ts`:

- `projectConfig` — `{ projectName, projectSlug, packageScope, projectTimezone }`.
- `ProjectConfig` type.

Sub-paths (consumed via `extends` in tsconfig.json / biome.json):

- `@repo/config/biome/{base,node,react}` — Biome config presets.
- `@repo/config/tsconfig/{base,library,library-react,node-app,nextjs,vite-react,expo}`
  — TypeScript config presets.

## Allowed dependencies

- Imports: none at runtime; the JSON is bundled at build time.
- Imported by: every app and package (TS configs, Biome configs, and
  `projectConfig` for runtime metadata in apps that need it — desktop,
  mobile, api).

## Usage

```ts
import { projectConfig } from "@repo/config";

console.log(`booting ${projectConfig.projectName} (${projectConfig.projectSlug})`);
```

```jsonc
// packages/some-package/tsconfig.json
{ "extends": "@repo/config/tsconfig/library", "include": ["src/**/*.ts"] }
```

## Renaming

`projectConfig` reflects whatever `project.config.json` contains. Update
both via `pnpm template:rename --name "..." --slug "..."` rather than
editing files by hand.

## Tests

```bash
pnpm --filter @repo/config test
```

Files: `src/index.test.ts` (asserts shape and round-trip with the JSON).
