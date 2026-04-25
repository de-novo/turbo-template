import { expect, test } from "@playwright/test";

test("home page renders the template title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fullstack TypeScript Template")).toBeVisible();
});
