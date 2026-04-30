---
id: frontend-design.shadcn-composition
name: shadcn Composition Boundary
description: Treat shadcn as a source/generator and compose it through the design system.
summary: >
  Apply this rule when adding, updating, styling, or composing shadcn/ui components, registries,
  presets, generated primitives, or shared frontend UI packages.
status: active
priority: 62
severity: high
scope:
  match:
    any:
      - fileExists: components.json
      - packageDependency: shadcn
      - packageDependency: "@shadcn/ui"
      - fileGlob: packages/design-system/**
      - fileGlob: packages/ui-primitives/**
      - fileGlob: apps/**/components/**
      - userTrigger: shadcn
      - userTrigger: registry
      - userTrigger: component
requires:
  - core.agent-behavior
  - frontend-design.design-contract
  - repo-contract.package-boundaries
conflictsWith: []
supersedes: []
owner: design-system
lastReviewed: 2026-04-30
---

# shadcn Composition

## Required

- Use the repo-local shadcn skill when the task touches shadcn: `.agents/skills/shadcn/SKILL.md`.
- Treat shadcn as upstream source/generator code. Prefer adding or updating primitives through the
  project package runner and shadcn CLI, then review the generated diff.
- Build product-facing reusable components in `packages/design-system` or another shared
  design-system package by composing shadcn primitives.
- Keep app-local components app-local only when they are genuinely one-off and do not alter shadcn
  source.
- Use shadcn docs/search/info before relying on memory for component APIs, aliases, presets, or
  registry behavior.
- Keep semantic tokens, project aliases, and the existing design contract instead of hardcoding
  colors, typography, icon libraries, or import paths.

## Forbidden

- Do not directly patch shadcn's package, registry source, or generated vendor internals to create
  product-specific behavior.
- Do not modify shadcn primitives as the primary customization mechanism when a wrapper/composed
  component in `packages/design-system` can express the need.
- Do not place reusable product UI only inside an app when it belongs in the shared design-system
  boundary.
- Do not decode preset codes, construct registry URLs, or guess registries manually; use the shadcn
  CLI and ask when the registry is ambiguous.

## Allowed Exceptions

- Generated shadcn files may be reviewed and minimally adjusted for project aliases, icon library
  alignment, missing imports, accessibility defects, or documented CLI output issues.
- A fork of a primitive is allowed only when the design-system wrapper cannot express the required
  behavior; document the reason in the component or design-system docs.
