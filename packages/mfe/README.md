# @repo/mfe

## Purpose

Contracts for the Module Federation lane: the Zod-validated remote
manifest schema and the runtime event names host and remotes use to
report lifecycle state. Owned jointly by the host (apps/mfe-host) and
every remote (e.g. apps/mfe-dashboard).

## Public surface

Re-exports from `src/index.ts`:

- `microFrontendManifestSchema`, `MicroFrontendManifest`,
  `parseMicroFrontendManifest(input)` — manifest contract.
- `resolveRemoteEntryUrl(manifestUrl, manifest)` — turn a manifest's
  `entry` (relative or absolute) into the absolute URL the host will
  load.
- `microFrontendEventNames` (`ready`, `error`),
  `createMicroFrontendReadyEvent(detail)`,
  `createMicroFrontendErrorEvent(detail)` — `bubbles: true,
  composed: true` events that escape the remote's shadow DOM and reach
  the host.

## Allowed dependencies

- Imports: `zod` only.
- Imported by: `apps/mfe-host` and every MFE remote app.

## Manifest example

```json
{
  "elementTag": "repo-mfe-dashboard",
  "entry": "/remote-entry.js",
  "name": "dashboard",
  "version": "0.0.0"
}
```

## Tests

```bash
pnpm --filter @repo/mfe test
```

Files: `src/manifest.test.ts`.
