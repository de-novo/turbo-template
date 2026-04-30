---
id: git-and-review.code-review
name: Code Review Discipline
description: Apply the vendored code-review skill for reviews and review-to-fix loops.
summary: >
  Apply this rule when reviewing diffs, triaging findings, converting review comments into fixes, or
  preparing review-ready commits.
status: active
priority: 41
severity: high
scope:
  match:
    any:
      - userTrigger: review
      - userTrigger: code-review
      - userTrigger: pr
      - userTrigger: finding
      - fileGlob: ".github/**"
      - fileGlob: "docs/**"
requires:
  - core.agent-behavior
  - git-and-review.git-workflow
  - testing-and-verification.gates
conflictsWith: []
supersedes: []
owner: maintainers
lastReviewed: 2026-04-30
---

# Code Review

## Required

- Use `.agents/skills/code-review-excellence/SKILL.md` for review tasks, review standards, and
  review-to-fix loops.
- Prioritize correctness, security, data loss, contract drift, and missing verification over style
  preferences.
- Report findings with concrete file references, severity, impact, and an actionable fix.
- When fixing review findings, keep each fix tied to the original defect and re-run the relevant
  gate.
- Distinguish code-level verification from real runtime verification.

## Forbidden

- Do not present formatting nits as blocking review findings when automated formatters already
  handle them.
- Do not broaden scope from a targeted review finding into unrelated refactors without a clear
  reason.
- Do not claim a finding is fixed until the relevant code path or documentation contract has been
  updated and checked.

## Allowed Exceptions

- Architecture review may include broader design tradeoffs when the user explicitly asks for it or
  the current change introduces cross-package risk.
