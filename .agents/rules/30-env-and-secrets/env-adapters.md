---
id: env-and-secrets.env-adapters
name: Env Adapters
description: Keep app environment access typed, app-scoped, and validation-backed.
summary: >
  Apply this rule when adding env keys, reading configuration, editing env examples, wiring provider
  secrets, or updating activation recipes that consume environment values.
status: active
priority: 30
severity: critical
scope:
  match:
    any:
      - fileGlob: apps/**/src/env.*
      - fileGlob: packages/env/**
      - fileGlob: env/**
      - fileGlob: docs/recipes/**
      - userTrigger: env
      - userTrigger: secret
      - userTrigger: process.env
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Env Adapters

## Required

- App code must use the per-app env adapters in `@repo/env/apps/<name>`.
- API-side DI should inject `API_ENV` / `ApiEnvModule` where Nest providers need env values.
- Add env keys through schema, examples, loader consumption, and docs together.
- Run `pnpm env:check` after env example changes.

## Forbidden

- Do not import from `process.env` directly outside per-app env adapter boundaries such as
  `apps/*/src/env.ts` or dedicated loader files.
- Do not teach forks to bypass env validation in activation recipes with broad `process.env` reads.
- Do not leak server secrets into client app env.

## Existing Guardrails

- API rejects foreign client prefixes such as `NEXT_PUBLIC_*`, `VITE_*`, and `EXPO_PUBLIC_*`.
- Client apps reject server secrets such as `DATABASE_URL` and `BETTER_AUTH_SECRET`.
