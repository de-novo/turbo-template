---
id: repo-contract.typescript
name: TypeScript Discipline
description: Apply the vendored TypeScript best-practices skill for TypeScript and JavaScript work.
summary: >
  Apply this rule when changing TypeScript, JavaScript, tsconfig, package exports, runtime schemas,
  domain contracts, or shared package APIs.
status: active
priority: 13
severity: high
scope:
  match:
    any:
      - fileGlob: "**/*.ts"
      - fileGlob: "**/*.tsx"
      - fileGlob: "**/*.js"
      - fileGlob: "**/*.jsx"
      - fileGlob: "**/tsconfig*.json"
      - fileGlob: packages/**
      - userTrigger: typescript
      - userTrigger: javascript
      - userTrigger: type
requires:
  - core.agent-behavior
  - repo-contract.package-boundaries
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# TypeScript

## Required

- Use `.agents/skills/typescript-best-practices/SKILL.md` when reading, writing, or reviewing
  TypeScript or JavaScript.
- Prefer type-first modeling: discriminated unions, exhaustive `never` checks, branded domain
  primitives where useful, and schema-derived types at runtime boundaries.
- Keep Zod schemas and inferred types aligned instead of duplicating DTO shapes by hand.
- Preserve package public APIs and exports deliberately; changing a shared type is a cross-package
  contract change.
- Pair this rule with React, Next.js, shadcn, or React Native skills when `.tsx`, UI, or
  app-specific framework behavior is involved.

## Forbidden

- Do not use `any`, broad assertions, or non-null assertions to hide uncertain data without a local
  justification and validation boundary.
- Do not duplicate runtime schema and TypeScript type definitions when inference can keep them in
  sync.
- Do not weaken compiler settings, tsconfig structure, or package boundaries to make a local error
  disappear.
- Do not add new `tsconfig.references` arrays.

## Allowed Exceptions

- Narrow type assertions are acceptable at well-documented integration boundaries when external
  libraries do not expose precise types and the value is validated before use.
