---
id: core.agent-behavior
name: Agent Behavior
description: Baseline behavior for coding agents working in this project.
summary: >
  Apply this rule for every task. It defines the default agent operating posture: inspect the real
  project state, keep changes scoped, preserve unrelated local work, and report verification
  honestly.
status: active
priority: 0
severity: critical
scope:
  match:
    any:
      - projectWide: true
      - userTrigger: agent
      - userTrigger: coding-agent
requires: []
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Agent Behavior

## Required

- Work from the actual repository state; inspect real files before making claims.
- Keep changes small, grounded, and aligned with the active user request.
- Preserve unrelated local changes. Do not revert files you did not intentionally change.
- Prefer `rg` / `rg --files` for search and `apply_patch` for focused manual edits.
- Communicate blockers, untested areas, and verification results explicitly.

## Forbidden

- Do not invent commands, paths, or contracts that are not present in the repo.
- Do not add broad template churn when a narrow rule or workflow update is enough.
- Do not treat generated or tool-local folders as canonical rule sources.

## Source Of Truth

- Root entrypoint: `AGENTS.md`.
- Structured rules: `.agents/rules/**`.
- Tool-specific adapters: `.agents/adapters/**`.
