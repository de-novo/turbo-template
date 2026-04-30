---
id: core.run-commands
name: Run Commands
description: Use the documented project commands instead of inventing alternatives.
summary: >
  Apply this rule whenever running, validating, building, testing, or documenting project commands.
  Prefer commands already declared by the project over ad-hoc substitutes.
status: active
priority: 1
severity: high
scope:
  match:
    any:
      - fileExists: package.json
      - fileGlob: package.json
      - fileGlob: .github/**
      - userTrigger: command
      - userTrigger: test
      - userTrigger: build
      - userTrigger: check
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---

# Run Commands

Use these commands instead of inventing alternatives:

```bash
pnpm install
pnpm dev:portless:setup   # recommended global portless@latest install + CA trust
pnpm dev:trust            # one-time portless CA trust
pnpm dev:proxy[:unprivileged|:stop]
pnpm dev                  # all surfaces through portless domains
pnpm dev:web | dev:api | dev:desktop | dev:mobile | dev:mfe | dev:mfe-host | dev:mfe-dashboard
pnpm check                # biome lint + tsconfig:check + typecheck + format:check + env:check + design:lint
pnpm env:check            # validate env/*/*.env.example
pnpm test                 # turbo run test (vitest + jest-expo for mobile)
pnpm test:e2e             # Playwright web smoke (opt-in, not in pnpm test)
pnpm build                # turbo build
pnpm db:generate | db:migrate | db:studio
pnpm template:rename --name "..." --slug "..." [--scope @acme]
pnpm template:auth        # select AUTH_MODE / AUTH_TOPOLOGY
pnpm template:surfaces --keep web,api  # prune unused apps from a fork
pnpm syncpack:check       # workspace catalog drift gate
pnpm licenses:check       # production license allow-list
```

CI (`.github/workflows/ci.yml`) runs install, audit high+, licenses, syncpack, check, build, then a
separate test job. `.github/workflows/security.yml` runs Trivy and CodeQL on push, PR, and weekly
schedule.
