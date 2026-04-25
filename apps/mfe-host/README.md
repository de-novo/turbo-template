# apps/mfe-host — Module Federation host

## Purpose

Runtime-composing host for the MFE lane. Reads a manifest URL from env,
fetches and validates the manifest via `@repo/mfe`, then loads the
remote entry script and mounts the declared custom element. Each remote
is owned by a separate team and ships its own manifest + entry.

## Stack

- Vite 8, React 19, Tailwind via `@tailwindcss/vite`
- `@repo/mfe` for manifest + lifecycle event contracts
- `@repo/design-system` for shell, status badge, empty state

## Dev

```bash
pnpm dev:mfe-host             # http://localhost:3100
pnpm dev:mfe                  # both host (3100) and dashboard (3101)
```

When running the host alone, point
`VITE_MFE_DASHBOARD_MANIFEST_URL` at a deployed remote.

## Build

```bash
pnpm --filter @repo/mfe-host build      # vite build → dist/
```

## Env

`VITE_*` only. Validated via `loadMfeHostEnv()` from
`@repo/env/apps/mfe-host`. Local example at
`env/local/mfe-host.env.example`.

## Remote entry contract

The host expects each remote to:

1. Serve a JSON manifest at a stable URL (validated by
   `parseMicroFrontendManifest`).
2. Expose the custom element registered under `manifest.elementTag` once
   the entry script has loaded.
3. Emit `repo:mfe:ready` when the element renders the first time and
   `repo:mfe:error` on failure (both `bubbles: true, composed: true`).

## Tests

```bash
pnpm --filter @repo/mfe-host test
```

Files: `src/env.test.ts`.

## Related

- `@repo/mfe` — shared manifest + event contracts.
- `apps/mfe-dashboard` — canonical remote example.
