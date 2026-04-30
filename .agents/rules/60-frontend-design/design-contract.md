---
id: frontend-design.design-contract
name: Design Contract
description: Preserve DESIGN.md as the agent-readable design-system contract.
summary: >
  Apply this rule when changing DESIGN.md, web UI, frontend design tokens, reusable design-system
  components, or visual implementation guidance.
status: active
priority: 60
severity: medium
scope:
  match:
    any:
      - fileExists: DESIGN.md
      - fileGlob: DESIGN.md
      - fileGlob: apps/web/**
      - fileGlob: packages/design-system/**
      - userTrigger: design
      - userTrigger: ui
      - userTrigger: frontend
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: design-system
lastReviewed: 2026-04-30
---

# Design Contract

## Required

- Treat `DESIGN.md` as the fast, agent-readable design-system brief.
- Keep `packages/design-system` as the implementation source for reusable design tokens and UI
  primitives.
- Run `pnpm design:lint` or the full `pnpm check` when design contract files change.

## Forbidden

- Do not drift into generic UI defaults when the existing template/design system has a direction.
- Do not add design tokens that are unused without either using them or documenting why they exist.
