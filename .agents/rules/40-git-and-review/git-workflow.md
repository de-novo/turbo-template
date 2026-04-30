---
id: git-and-review.git-workflow
name: Git Workflow
description: Keep git publication intentional, review-focused, and non-destructive.
summary: >
  Apply this rule whenever reviewing code, staging changes, committing, pushing, preparing PRs, or
  handling a dirty worktree.
status: active
priority: 40
severity: critical
scope:
  match:
    any:
      - projectWide: true
      - userTrigger: commit
      - userTrigger: push
      - userTrigger: review
      - userTrigger: pr
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Git Workflow

## Required

- Stage only the relevant slice for the requested change.
- Use the repository's structured commit body fields: `Constraint`, `Rejected`, `Confidence`,
  `Scope-risk`, `Directive`, `Tested`, and `Not-tested`.
- Include honest verification results and untested areas in the commit body and final response.
- For review requests, lead with findings ordered by severity and cite exact files/lines.

## Forbidden

- Do not amend commits unless explicitly requested.
- Do not force-push.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --` unless the
  user explicitly requested or approved that exact action.
- Do not revert unrelated user or local changes.
- Do not claim runtime verification when only static checks or code edits ran.
