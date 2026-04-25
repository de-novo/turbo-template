# apps/e2e — Playwright

## Purpose

End-to-end tests that exercise real browser flows against the
deployed-or-running stack. The smoke specs cover the template
baseline; product forks add real journey tests (sign-in,
create-resource, list, etc.) after the first domain ships.

E2E is intentionally NOT in the default `pnpm test` fanout. The
package's script is named `test:e2e` (not `test`) so Turbo's `test`
task does not pick it up. Vitest fan-out stays fast and
deterministic; flaky network or browser issues don't block the
rest of the matrix.

## First run

```bash
pnpm test:e2e:install   # one-time, downloads chromium
pnpm test:e2e           # runs the suite
```

(Equivalent: `pnpm --filter @repo/e2e install:browsers`,
`pnpm --filter @repo/e2e test:e2e`.)

`playwright.config.ts` boots `pnpm dev:web` automatically via
`webServer`. If you already have the web app running, set
`E2E_NO_WEB_SERVER=1` to skip the auto-start.

## Targeting a deployed environment

Override `E2E_WEB_URL` to point the suite at any reachable web URL.
Useful for preview environments and post-deploy smoke tests:

```bash
E2E_WEB_URL=https://preview.example.com \
  E2E_NO_WEB_SERVER=1 \
  pnpm test:e2e
```

## Browser matrix

Default: chromium only. Add firefox / webkit / mobile devices in
`playwright.config.ts` `projects:` once a real reason exists —
cross-browser passes triple CI time and rarely catch new bugs in a
modern Next.js app.

## Specs

- `tests/home.spec.ts` — renders the template home page and asserts
  the baseline cards. Also asserts the security headers from
  `apps/web/next.config.ts` so a regression on those is caught at
  the boundary.

## Allowed dependencies

`@playwright/test` only. The suite calls the web app over HTTP and
must not import workspace TypeScript modules — that breaks the
"black box" property of E2E.

## CI

E2E is not yet part of `.github/workflows/ci.yml` because boot time
(install browsers + warm web app) doubles PR feedback. Forks that
want it should add a separate workflow that runs
`pnpm test:e2e:install` then `pnpm test:e2e`, optionally only on
label or release.
