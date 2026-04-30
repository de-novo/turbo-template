---
id: repo-contract.template-scope
name: Template Scope
description: Keep this repository reusable as a fullstack TypeScript template.
summary: >
  Apply this rule when changing template strategy, README guidance, recipes, project configuration,
  or anything that could make downstream forks inherit product-specific assumptions.
status: active
priority: 10
severity: high
scope:
  match:
    any:
      - fileGlob: README.md
      - fileGlob: docs/**
      - fileGlob: project.config.json
      - userTrigger: template
      - userTrigger: scaffold
      - userTrigger: downstream
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Template Scope

## Required

- Keep the repo generic first. Downstream products fork via `pnpm template:rename`.
- Preserve the stable internal package scope `@repo/*` unless a rename script changes it
  deliberately.
- Start architecture questions from `docs/capabilities.md`, `docs/template-strategy.md`, and
  `docs/technical-stack.md`.
- Keep activation recipes copy-safe and aligned with actual ports, env loaders, and DI tokens.

## Forbidden

- Do not hard-code product-specific assumptions into the reusable template baseline.
- Do not introduce guidance that bypasses documented template scripts.
- Do not make runtime claims that are not backed by source, docs, or a verified command.
