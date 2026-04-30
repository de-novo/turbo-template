---
id: testing-and-verification.gates
name: Verification Gates
description: Use the repo's existing gates and report verification precisely.
summary: >
  Apply this rule when choosing validation commands, reporting tested/not-tested status, modifying
  scripts, touching CI, or preparing a final answer after code or documentation changes.
status: active
priority: 50
severity: high
scope:
  match:
    any:
      - fileGlob: scripts/**
      - fileGlob: .github/**
      - fileGlob: package.json
      - userTrigger: test
      - userTrigger: check
      - userTrigger: verify
      - userTrigger: ci
requires:
  - core.agent-behavior
  - core.run-commands
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Verification Gates

## Required

- Prefer the documented commands over invented alternatives.
- Use `pnpm check` for the broad local gate: lint, tsconfig check, typecheck, format check, env
  check, and design lint.
- Use `pnpm build` and `pnpm test` before final publication when the touched surface warrants it.
- Use `pnpm test:scripts` for script changes.
- Use `pnpm syncpack:check` for workspace catalog drift.
- Use `git diff --check` before commit.

## Generated File Guard

- If `apps/web` changed or `pnpm build` ran, verify `apps/web/next-env.d.ts` did not flip to an
  unwanted generated state before committing.

## Reporting

- Distinguish `Tested` from `Not-tested`.
- If a gate is skipped because the change is docs-only or scripts-only, say that directly.
