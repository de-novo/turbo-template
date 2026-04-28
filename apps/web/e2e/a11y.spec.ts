import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Axe-core a11y gate. Runs as part of `pnpm --filter @repo/web test:e2e`
 * (no separate script — accessibility issues should fail the gate
 * alongside functional regressions). Scoped to WCAG 2.1 A + AA tags
 * since those are the rules with broad regulatory and library
 * support; AAA is excluded (typically too strict for product
 * defaults — re-add if your fork has a compliance posture that
 * requires it).
 */

test("home page has no detectable a11y violations (WCAG 2.1 A + AA)", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
