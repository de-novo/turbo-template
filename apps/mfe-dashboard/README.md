# apps/mfe-dashboard — Module Federation remote

## Purpose

Reference Module Federation remote. Ships its own Vite library build, a
JSON manifest, and a custom element registered at runtime. Loaded by
apps/mfe-host (or any host) at runtime — there is no compile-time
import.

## Stack

- Vite 8 (library mode), React 19, shadow DOM rendering
- `@repo/mfe` for shared lifecycle event helpers

## Dev

```bash
pnpm dev:mfe-dashboard        # http://localhost:3101
pnpm dev:mfe                  # host (3100) + dashboard (3101)
```

## Build

```bash
pnpm --filter @repo/mfe-dashboard build
# dist/remote-entry.js
# dist/mfe-manifest.json (from public/)
```

The build emits a single `remote-entry.js` ESM module via Vite's
`build.lib`. Hosts load this URL based on the manifest's `entry` field.

## Manifests

- `public/mfe-manifest.json` — production. `entry: /remote-entry.js`.
- `public/mfe-manifest.dev.json` — development. Points the host
  directly at the source `register.tsx` for fast feedback.

Both files are validated against `@repo/mfe`'s
`microFrontendManifestSchema` in tests.

## Custom element contract

`src/register.tsx` registers `<repo-mfe-dashboard>` once. Connecting it
to the DOM:

1. Creates a shadow root for style isolation.
2. Mounts the React tree.
3. Emits `repo:mfe:ready` so the host knows it can stop showing the
   loading state.

Errors emitted on `window.error` are republished as
`repo:mfe:error` for the host's error boundary.

## Tests

```bash
pnpm --filter @repo/mfe-dashboard test
```

Files: `src/manifest.test.ts` (validates both committed manifest files).
