---
id: core.contradiction-audit
name: Contradiction Audit
description: Find and resolve contradictions before agent rules become trusted guidance.
summary: >
  Apply this rule when adding, editing, moving, deleting, or reviewing rules. It prevents hard
  overrides, Required sections, Forbidden sections, exceptions, docs, and source behavior from
  drifting apart.
status: active
priority: 2
severity: critical
scope:
  match:
    any:
      - fileGlob: AGENTS.md
      - fileGlob: .agents/**
      - userTrigger: rule
      - userTrigger: contradiction
      - userTrigger: policy
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Contradiction Audit

## Required

- When adding or editing rules, compare the new text against `AGENTS.md`, `.agents/manifest.json`,
  and existing `.agents/rules/**`.
- Check the same topic across Required, Forbidden, Allowed Exceptions, and Hard Overrides.
- Prefer the stricter rule when two rules overlap, then document the allowed exception explicitly.
- Treat contradictions between docs and source as defects; update the stale side or record the
  untested gap.
- Run `pnpm agents:check` after rule changes so direct Required/Forbidden collisions are caught.

## Forbidden

- Do not leave two rules that tell agents to both do and not do the same action.
- Do not hide exceptions in prose if a rule has a Forbidden section; put exceptions under
  `Allowed Exceptions`.
- Do not resolve contradictions by deleting safety constraints without explaining why the constraint
  is obsolete.

## Review Checklist

- Does `AGENTS.md` still match the canonical rule files?
- Does the manifest priority order match the intended precedence?
- Does a Required bullet in one file conflict with a Forbidden bullet in another?
- Does an Allowed Exception undermine the rule instead of narrowing it?
- Do docs, env examples, scripts, and source code still agree with the rule text?
