# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Cline, Copilot Workspace, etc.) working in this
repository.

## What this repository is

A TypeScript Turborepo monorepo template that downstream products fork via `pnpm template:rename`.
Six applications (`web`, `api`, `desktop`, `mobile`, `mfe-host`, `mfe-dashboard`) and twelve
`@repo/*` packages (`auth`, `clients`, `config`, `contracts`, `db`, `design-system`, `env`,
`infrastructure`, `mfe`, `platform`, `testing`, `ui-primitives`) on Node 24 / pnpm 10 / Turborepo
2.9 / Biome 2 / TypeScript 6.

Start with [docs/capabilities.md](./docs/capabilities.md) for the surface map,
[docs/template-strategy.md](./docs/template-strategy.md) for naming/scope decisions, and
[docs/technical-stack.md](./docs/technical-stack.md) for stack-level rationale.

## Structured Rule Source

Canonical detailed agent rules live in `.agents/rules/{NN-category}/{rule-name}.md`, indexed by
[.agents/manifest.json](./.agents/manifest.json). Read them in manifest priority order.
Tool-specific files under `.agents/adapters/` are adapters only; they are not the source of truth.
Use [.agents/skills/rule-management/SKILL.md](./.agents/skills/rule-management/SKILL.md) when
adding, editing, moving, deleting, or validating rules.

Minimum read order:

1. [.agents/rules/00-core/agent-behavior.md](./.agents/rules/00-core/agent-behavior.md)
2. [.agents/rules/00-core/run-commands.md](./.agents/rules/00-core/run-commands.md)
3. [.agents/rules/00-core/contradiction-audit.md](./.agents/rules/00-core/contradiction-audit.md)
4. [.agents/rules/10-repo-contract/template-scope.md](./.agents/rules/10-repo-contract/template-scope.md)
5. [.agents/rules/10-repo-contract/package-boundaries.md](./.agents/rules/10-repo-contract/package-boundaries.md)
6. [.agents/rules/10-repo-contract/repo-map.md](./.agents/rules/10-repo-contract/repo-map.md)
7. [.agents/rules/10-repo-contract/typescript.md](./.agents/rules/10-repo-contract/typescript.md)
8. [.agents/rules/10-repo-contract/turborepo.md](./.agents/rules/10-repo-contract/turborepo.md)
9. [.agents/rules/20-dev-runtime/portless.md](./.agents/rules/20-dev-runtime/portless.md)
10. [.agents/rules/30-env-and-secrets/env-adapters.md](./.agents/rules/30-env-and-secrets/env-adapters.md)
11. [.agents/rules/40-git-and-review/git-workflow.md](./.agents/rules/40-git-and-review/git-workflow.md)
12. [.agents/rules/40-git-and-review/code-review.md](./.agents/rules/40-git-and-review/code-review.md)
13. [.agents/rules/50-testing-and-verification/gates.md](./.agents/rules/50-testing-and-verification/gates.md)
14. [.agents/rules/50-testing-and-verification/playwright.md](./.agents/rules/50-testing-and-verification/playwright.md)
15. [.agents/rules/60-frontend-design/design-contract.md](./.agents/rules/60-frontend-design/design-contract.md)
16. [.agents/rules/60-frontend-design/nextjs.md](./.agents/rules/60-frontend-design/nextjs.md)
17. [.agents/rules/60-frontend-design/shadcn-composition.md](./.agents/rules/60-frontend-design/shadcn-composition.md)
18. [.agents/rules/60-frontend-design/accessibility.md](./.agents/rules/60-frontend-design/accessibility.md)

## Hard Overrides

- **Do not amend or force-push.** Always create a new commit.
- **Do not use `localhost:{port}` for human-facing app access or API calls.** Browser URLs, docs
  examples, OAuth redirect URIs, and app-to-app env values must use portless domains. Raw localhost
  ports are allowed only for internal framework listeners, automated tests, container healthchecks,
  and non-HTTP dependencies such as Postgres, OTel collectors, or Expo Metro.
- **Do not import from `process.env` directly** outside the per-app env adapter boundary. Use
  `@repo/env/apps/<name>` loaders and API DI (`API_ENV` / `ApiEnvModule`) where applicable.
- **No new `tsconfig.references` arrays.** Turborepo derives the graph from `package.json`
  `workspace:*` dependencies.
- **Keep activation recipes copy-safe.** Provider examples must follow the same env and DI contracts
  as source code.
- **Next.js work follows the vendored Vercel Labs skills.** Apply the repo-local
  `.agents/skills/vercel-react-best-practices`, `.agents/skills/vercel-composition-patterns`, and
  `.agents/skills/web-design-guidelines` skills when touching React/Next.js code.
- **Do not customize by editing shadcn directly.** Use shadcn as source/generator input and compose
  reusable product UI through `packages/design-system` or the relevant shared design-system package.
- **TypeScript and Turborepo changes use vendored skills.** Apply repo-local
  `.agents/skills/typescript-best-practices` for TS/JS work and `.agents/skills/turborepo-monorepo`
  for workspace, task graph, and package-boundary changes.
- **Reviews, Playwright, and accessibility have dedicated skills.** Apply repo-local
  `.agents/skills/code-review-excellence`, `.agents/skills/playwright`, and
  `.agents/skills/fixing-accessibility` for those lanes.

## Finish Checklist

1. Run the relevant gates from `.agents/rules/50-testing-and-verification/gates.md`.
2. If you touched `apps/web` or ran `pnpm build`, verify `apps/web/next-env.d.ts` stayed in the
   tracked state.
3. Use the structured commit body documented in `.agents/rules/40-git-and-review/git-workflow.md`.
4. Run `pnpm agents:check` after editing `.agents/**` or `AGENTS.md`.
