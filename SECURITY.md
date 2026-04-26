# Security Policy

## Supported versions

This template ships as a baseline for downstream products. There are no LTS branches — only `main`.
Forks are expected to track their own version policy after `pnpm template:rename`.

## Reporting a vulnerability

Please **do not** open a public GitHub issue, pull request, or discussion for security reports.

Instead, contact the repository owner directly via:

- Private GitHub Security Advisory:
  https://github.com/de-novo/turbo-template/security/advisories/new
- Or email the owner listed in the repository's GitHub profile.

Include:

- A description of the issue and the impact you observed.
- Steps to reproduce, ideally with a minimal proof-of-concept.
- Affected components (e.g. `apps/api`, `packages/auth`, `packages/infrastructure`).
- Whether the issue is exploitable in the default template configuration, in a downstream fork, or
  both.

## What to expect

- Acknowledgement within 5 business days.
- A coordinated disclosure plan if the issue is confirmed.
- Public advisory and patch released together for the default template; downstream forks are
  responsible for picking up the patch in their own release windows.

## Hardening already in place

- Per-IP rate limiting on `apps/api` via `@nestjs/throttler` (default: 100 req/min,
  `apps/api/src/app.module.ts`). `/health/*` and `/metrics` opt out via `@SkipThrottle()`.
- Conservative web security headers on every response (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`).
- Foreign env-prefix rejection at the `@repo/env` boundary so client bundles cannot see server
  secrets like `DATABASE_URL` or `BETTER_AUTH_SECRET`.
- `pnpm audit --audit-level=high` runs in CI and gates merges.
- Trivy + CodeQL run on push, PR, and weekly schedule (`.github/workflows/security.yml`).
- Production license allow-list (`pnpm licenses:check`).
- CycloneDX SBOM generated on each release (`.github/workflows/sbom.yml`).
- Dependabot grouped weekly bumps + monthly Docker base-image bumps.

## Things that are intentionally not in the default

- A Content-Security-Policy header. CSP is application-shaped (inline scripts, fonts, analytics
  origins) and a default value would either be too permissive or break valid features. Forks should
  add a CSP once their asset footprint is known.
- An auth layer on `/metrics`. Prometheus scrapers do not carry bearer tokens; restrict `/metrics`
  at the network layer (private VPC, sidecar proxy, ingress allow-list).
- `@opentelemetry/auto-instrumentations-node`. Auto-patching every transport adds boot cost;
  consumers wanting auto-HTTP/fs spans should add it deliberately.
