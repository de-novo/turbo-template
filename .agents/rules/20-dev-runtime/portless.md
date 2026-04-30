---
id: dev-runtime.portless
name: Portless Domain Runtime
description: Keep local HTTP app access domain-based through portless.
summary: >
  Apply this rule when changing local dev scripts, HTTP app URLs, docs curl examples, OAuth redirect
  URIs, CORS origins, or app-to-app HTTP env values. Portless is a domain router, not an app-port
  registry.
status: active
priority: 20
severity: high
scope:
  match:
    any:
      - packageDependency: portless
      - fileExists: portless.json
      - fileGlob: portless.json
      - fileGlob: package.json
      - fileGlob: env/**
      - fileGlob: docs/**
      - userTrigger: portless
      - userTrigger: localhost
      - userTrigger: oauth
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Portless

## Required

- HTTP app `dev` scripts must call `portless`.
- The real framework command belongs in `dev:app`.
- Portless names are centralized in `portless.json`.
- Keep `pnpm dev:portless:setup` installing `portless@latest` for the global CLI.
- Keep the repo-local `portless` devDependency as the reproducible fallback for pnpm scripts.
- Browser URLs, docs curl examples, OAuth redirect URIs, and app-to-app HTTP env values must use
  portless domains.

## Forbidden

- Do not use `localhost:{port}` for human-facing app access or API calls.
- Do not register or document OAuth redirects with `localhost:{port}`.
- Do not put `localhost:{port}` into app API base env values such as `NEXT_PUBLIC_API_URL`,
  `BETTER_AUTH_URL`, or `CORS_ORIGINS`.

## Allowed Exceptions

- Internal framework listeners.
- Automated test harnesses.
- Container healthchecks.
- Non-HTTP dependencies such as Postgres, OTel collectors, and Expo Metro.
- Raw package `dev:app` fallback commands for contributors who cannot run portless.
