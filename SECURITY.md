# Security Policy

## Supported versions

This template is private and ships as a baseline for downstream
products. There are no LTS branches — only `main`. Forks are expected
to track their own version policy after `pnpm template:rename`.

## Reporting a vulnerability

Please **do not** open a public GitHub issue, pull request, or
discussion for security reports.

Instead, contact the repository owner directly via:

- Private GitHub Security Advisory:
  https://github.com/de-novo/turbo-template/security/advisories/new
- Or email the owner listed in the repository's GitHub profile.

Include:

- A description of the issue and the impact you observed.
- Steps to reproduce, ideally with a minimal proof-of-concept.
- Affected components (e.g. `apps/api`, `packages/auth-server`,
  `ops/gitops`).
- Whether the issue is exploitable in the default template
  configuration, in a downstream fork, or both.

## What to expect

- Acknowledgement within a few business days.
- Triage and severity assessment using CVSS 4.0 where applicable.
- A fix or mitigation timeline communicated back to the reporter.
- Public disclosure coordinated after a fix is available — the
  reporter is credited unless they prefer otherwise.

## Defensive baseline shipped by the template

These controls are **already applied** and should not regress without
review:

- Per-app env loaders in `@repo/env` reject foreign keys at the
  boundary (`assertNoForeignKeys` in `packages/env/src/source.ts`).
  Web/desktop/mobile bundles cannot read `BETTER_AUTH_SECRET` or
  `DATABASE_URL`.
- `BETTER_AUTH_SECRET` is enforced to ≥ 32 chars in production via
  `requireInProduction` (`packages/env/src/apps/api.ts`).
- Conventional Commits + `commit-msg` hook (commitlint) so revert /
  hotfix history stays traceable.
- `pre-commit` runs `biome check --write` on staged files (lint-staged).
- `.gitignore` refuses `.sops.yaml`, `*.dec.yaml`, `*.age`, and any
  unencrypted SOPS-managed file outside `*.enc.yaml.example` templates.
- Pino redact paths cover `authorization`, `cookie`, `set-cookie`, and
  any field named `password` (see
  `apps/api/src/logger.module.ts`).

## What forks must verify before deploying

- Set `BETTER_AUTH_SECRET` to 32+ random characters
  (`openssl rand -base64 32`). Never commit it.
- Set `WEB_ORIGIN`, `BETTER_AUTH_URL`, and per-app public URLs to your
  real deployed hostnames.
- Decide a secret strategy from
  [docs/secret-management.md](./docs/secret-management.md) — platform
  store, Vault, or SOPS GitOps. Do not check in raw secrets.
- Run `pnpm audit --audit-level=high` periodically (or in your CI).
- Update `apps/web/next.config.ts` headers (CSP especially) to match
  your application's actual asset / inline-script footprint.

## Out of scope

- Vulnerabilities in dependencies that have not yet been published
  upstream — please report those to the upstream project first.
- Issues in forks that have diverged from the template — report to the
  fork's maintainers.
