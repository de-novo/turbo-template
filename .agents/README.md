# Agent Rules

Canonical coding-agent rules live under `.agents/rules/{NN-category}/{rule-name}.md`. The root
`AGENTS.md` is the entrypoint for tools that only read repository-root guidance; this folder holds
the structured rule source for humans, agents, and downstream template forks.

## Layout

```text
.agents/
  manifest.json
  rules/
    00-core/
    10-repo-contract/
    20-dev-runtime/
    30-env-and-secrets/
    40-git-and-review/
    50-testing-and-verification/
    60-frontend-design/
  skills/
    rule-management/
      schema/
        rule.schema.json
  adapters/
```

## Rule File Contract

Each rule file uses skill-like frontmatter followed by short, actionable sections:

```md
---
name: dev-runtime.portless
description: Keep local HTTP app access domain-based through portless.
summary: >
  Apply this rule when local HTTP access, OAuth callbacks, CORS origins, docs examples, or app API
  base URLs are changed.
status: active
priority: 20
severity: high
scope:
  match:
    any:
      - packageDependency: portless
      - fileExists: portless.json
      - userTrigger: localhost
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Portless

## Required

- ...

## Forbidden

- ...

## Allowed Exceptions

- ...
```

## Operating Rules

- Keep `.agents/rules/*` as the canonical detailed rule source.
- Keep rule frontmatter aligned with `.agents/skills/rule-management/schema/rule.schema.json`; use
  `scope.match.any` signals instead of hard-coding every app path.
- Use `.agents/skills/rule-management/SKILL.md` as the reusable process guide for adding, editing,
  moving, or deleting structured rules. The skill is intentionally generic; this repository binds it
  to `.agents/manifest.json`, `AGENTS.md`, and `pnpm agents:check`.
- Keep `AGENTS.md` as the root entrypoint and high-signal index.
- Keep tool-specific files in `.agents/adapters/*`; do not make `.claude/`, `.cursor/`, or other
  local tool folders the source of truth.
- Use `pnpm agents:check` after adding, moving, or deleting rule files.
