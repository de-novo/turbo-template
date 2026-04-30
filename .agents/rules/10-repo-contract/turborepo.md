---
id: repo-contract.turborepo
name: Turborepo Workspace Discipline
description: Apply the vendored Turborepo monorepo skill for workspace and task-graph changes.
summary: >
  Apply this rule when changing turbo.json, package scripts, workspace package boundaries, CI task
  orchestration, caching behavior, or monorepo build/test/typecheck pipelines.
status: active
priority: 14
severity: high
scope:
  match:
    any:
      - fileExists: turbo.json
      - fileExists: pnpm-workspace.yaml
      - fileGlob: turbo.json
      - fileGlob: pnpm-workspace.yaml
      - fileGlob: package.json
      - fileGlob: packages/**/package.json
      - fileGlob: apps/**/package.json
      - userTrigger: turborepo
      - userTrigger: monorepo
      - userTrigger: workspace
requires:
  - core.run-commands
  - repo-contract.package-boundaries
  - testing-and-verification.gates
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Turborepo

## Required

- Use `.agents/skills/turborepo-monorepo/SKILL.md` when changing workspace shape, Turborepo tasks,
  package scripts, CI task ordering, cache outputs, or package dependency topology.
- Keep the dependency graph package-owned through `package.json` `workspace:*` dependencies.
- Keep `turbo.json` outputs and dependencies accurate for build, typecheck, test, and generated
  artifacts.
- Validate graph-impacting changes with `pnpm tsconfig:check`, `pnpm syncpack:check` when relevant,
  and the repo gate documented in the testing rule.
- Prefer narrow filtered commands during iteration, but run the relevant full gate before finishing.

## Forbidden

- Do not introduce tsconfig project references as a graph source.
- Do not add scripts that bypass package-level ownership or make Turborepo cache state misleading.
- Do not change task outputs without checking whether cached artifacts, generated files, or CI
  behavior are affected.
- Do not add workspace dependencies without `workspace:*` when the dependency is internal.

## Allowed Exceptions

- Temporary one-off diagnostic commands may bypass Turborepo if they are not committed into scripts,
  CI, or docs.
