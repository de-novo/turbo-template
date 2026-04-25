# 0002 — Per-app env loaders with foreign-key guards

- **Status**: Accepted
- **Date**: 2026-04-25

## Context

The first revision used a single `baseEnvSchema` in `@repo/contracts`
that every app extended. One root `.env.example` documented every
variable. The shape was simple but had two failure modes that real
deployments hit:

1. **Cross-app leakage.** Nothing prevented `apps/web` from reading
   `BETTER_AUTH_SECRET` or `DATABASE_URL` if the build pipeline
   happened to inline them. The bundle would still build; the
   secrets would only show up in a leaked source map or a
   support session.
2. **One bundle for the monorepo, not per app.** Production deploy
   pipelines map one secret set per service, not one shared blob for
   every app. The single root `.env.example` did not match how
   Kubernetes Secrets, Vault, External Secrets, or platform secret
   stores actually work.

Forks routinely solved (1) and (2) by hand within a week of cloning
the template. The template should solve them.

## Decision

Replace `baseEnvSchema` with per-app loaders under
`@repo/env/apps/<name>`. Each loader:

- Picks only the keys it recognizes from the source (`pickEnv`).
- Calls `assertNoForeignKeys` to reject foreign prefixes
  (`NEXT_PUBLIC_*` in api, `EXPO_PUBLIC_*` in web, etc.) and
  per-app forbidden secret keys (`BETTER_AUTH_SECRET` and
  `DATABASE_URL` in any client bundle).
- Uses `requireInProduction` to mark keys mandatory only when
  `APP_ENV === "production"`, so local development stays loose.

Examples ship per app per environment under
`env/{local,production}/<app>.env.example`. `pnpm env:check`
validates every example with the matching loader and runs in CI.

## Consequences

- **Benefits**: web/desktop/mobile bundles cannot read server-only
  secrets even by accident. Production pipelines map cleanly: one
  example file ↔ one loader ↔ one secret bundle. Production
  requirements are enforced statically (`requireInProduction`) so
  startup fails fast on misconfiguration.
- **Costs**: 18 packages now coordinate around a single env loader
  package. Adding a new app requires writing a loader, an example,
  and wiring it into `check-examples.ts` (documented in
  `packages/env/README.md`). The previous `parseApiEnv` /
  `parseWebEnv` API is gone — forks that copied them must migrate
  to `loadApiEnv` / `loadWebEnv`.
- **Risks / open questions**: the foreign-key list is per-app; new
  bundlers (Bun, ESBuild standalone) may introduce new prefixes that
  need adding.

## Alternatives considered

- **Keep the shared `baseEnvSchema`, add prefix guards inside it**:
  rejected — guards live in the loader function, not in the schema.
  Putting them on a shared schema either duplicates them per
  consumer or weakens them to the lowest common denominator.
- **One env loader per package (instead of per app)**: rejected —
  `@repo/db` and `@repo/auth-server` need different keys depending on
  who imports them. Per-app is the correct boundary because
  deployments are per app.
- **Continue with one root `.env.example` and document the split
  in comments**: rejected — comments are not parsed, do not fail CI,
  and let drift accumulate.

## References

- `packages/env/src/source.ts` (`assertNoForeignKeys`, `pickEnv`)
- `packages/env/src/production.ts` (`requireInProduction`)
- `packages/env/src/apps/api.ts` reference loader
- `packages/env/README.md`
- Commit `798ace1` (`feat(env): adopt @repo/env per-app loaders`)
