---
id: testing-and-verification.playwright
name: Playwright E2E Discipline
description: Apply the vendored Playwright skill for browser E2E tests and UI runtime checks.
summary: >
  Apply this rule when adding or changing Playwright tests, browser smoke tests, user-flow
  assertions, selectors, or web runtime verification.
status: active
priority: 51
severity: high
scope:
  match:
    any:
      - packageDependency: "@playwright/test"
      - fileExists: playwright.config.ts
      - fileGlob: "**/playwright.config.*"
      - fileGlob: "**/e2e/**"
      - fileGlob: "**/*.e2e.ts"
      - userTrigger: playwright
      - userTrigger: e2e
      - userTrigger: browser-test
requires:
  - dev-runtime.portless
  - testing-and-verification.gates
conflictsWith: []
supersedes: []
owner: qa
lastReviewed: 2026-04-30
---

# Playwright

## Required

- Use `.agents/skills/playwright/SKILL.md` when adding, changing, or reviewing Playwright tests.
- Prefer user-facing locators: `getByRole`, `getByLabel`, `getByText`, and `getByTestId` only when
  semantic selectors are not stable enough.
- Use web-first assertions such as `toBeVisible`, `toHaveText`, and `toHaveURL`.
- Keep E2E tests focused on stable user flows that the template or fork is expected to preserve.
- Use portless domains for human-facing app URLs and documented browser flows.

## Forbidden

- Do not use hardcoded waits such as `waitForTimeout` to hide race conditions.
- Do not rely on fragile CSS selectors when accessible locators are available.
- Do not make Playwright tests depend on local-only data that is not created by the test or fixture.
- Do not document raw `localhost:{port}` URLs for browser flows.

## Allowed Exceptions

- Internal Playwright web server config may bind to raw local ports when the public test URL remains
  stable and the value is not used as an application API base URL.
