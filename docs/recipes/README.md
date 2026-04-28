# Recipes

Cookbook-style walkthroughs for the small set of changes that come up repeatedly. Each recipe lists
the exact files to touch in order, links to the canonical reference example in the codebase, and
calls out the gotchas the template's contributors hit while building it.

These are not exhaustive design docs — for the **why** behind a decision, see [docs/adr/](../adr/).
For the **what ships**, see [docs/capabilities.md](../capabilities.md).

| Recipe                                                    | When to reach for it                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Add an API domain module](./add-api-domain-module.md)    | A new resource under `apps/api` (e.g. `orders`, `invoices`, `posts`). Mirrors the canonical `notes` example. |
| [Add an env key](./add-env-key.md)                        | Schema → example → loader → consume. Keeps `pnpm env:check` and CI green.                                    |
| [Add a scheduled job](./add-scheduled-job.md)             | A new `@nestjs/schedule` cron / interval / timeout, behind `JOBS_ENABLED`.                                   |
| [Switch the auth mode](./switch-auth-mode.md)             | Move from Better Auth embedded to external OIDC, SSO gateway, or central auth-service.                       |
| [Protect an API route](./protect-an-api-route.md)         | `AuthenticatedGuard` + `@CurrentUser()` for `AUTH_MODE=better-auth-embedded`.                                |
| [Document an API route](./document-an-api-route.md)       | When you change `apps/api`, update the matching `docs/api/<resource>.md` in the same PR (per ADR 0011).      |
| [Enable Content-Security-Policy](./enable-csp.md)         | Add CSP to `apps/web`. Nonce-based middleware + Report-Only soak before flipping to enforce.                 |
| [Enable multi-tenancy](./enable-multi-tenancy.md)         | Swap `noopTenantResolver` for a real one. Middleware + ALS already wired (per ADRs 0004 + 0013).             |
| [Production go-live checklist](./production-checklist.md) | Required env vars, auth posture, observability, CORS, container, smoke checks before traffic lands.          |

If you're touching something not listed here, the most useful next read is usually the closest
existing example in the codebase — the template is intentionally small enough to grep.
