---
id: repo-contract.package-boundaries
name: Package Boundaries
description: Preserve monorepo package boundaries and TypeScript graph ownership.
summary: >
  Apply this rule when changing apps, packages, workspace dependencies, TypeScript configs, test
  placement, or shared contract boundaries.
status: active
priority: 11
severity: high
scope:
  match:
    any:
      - fileGlob: apps/**
      - fileGlob: packages/**
      - fileGlob: package.json
      - fileGlob: tsconfig*.json
      - userTrigger: package
      - userTrigger: workspace
      - userTrigger: contract
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Package Boundaries

## Required

- Keep `@repo/contracts` runtime-light: no NestJS, Next.js, browser-only APIs, or ORM clients.
- Keep package dependencies expressed through `package.json` `workspace:*` edges.
- Put tests alongside source as `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx`.
- Keep each package's `tsconfig.json` excluding tests so `tsc` does not emit test files into
  `dist/`.

## Forbidden

- Do not add new `tsconfig.references` arrays; `pnpm tsconfig:check` rejects them.
- Do not create `packages/db/src/env.ts`; `DATABASE_URL` is owned by `@repo/env/apps/api`.
- Do not import app runtime frameworks into shared contracts.
