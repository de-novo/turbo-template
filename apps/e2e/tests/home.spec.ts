import { expect, test } from "@playwright/test";

/**
 * Reference happy-path. Loads the web home page and confirms the
 * template baseline renders. Replace with real product flows
 * (sign-in → create-resource → list) after the first domain ships.
 *
 * Keep e2e specs assertion-light at the boundary level — they should
 * fail when the user-visible contract breaks, not when an internal
 * implementation detail moves.
 */
test.describe("home — default locale (en)", () => {
	test("`/` redirects to `/en` and renders the English baseline", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page).toHaveURL(/\/en$/);

		await expect(page).toHaveTitle(/Fullstack TypeScript Template/);

		await expect(
			page.getByRole("heading", { name: "Fullstack TypeScript Template" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Shared contracts" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Design system" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Project rename" }),
		).toBeVisible();
	});

	test("ships the conservative security headers", async ({ request }) => {
		const response = await request.get("/en");
		const headers = response.headers();
		expect(headers["x-frame-options"]).toBe("DENY");
		expect(headers["x-content-type-options"]).toBe("nosniff");
		expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
		expect(headers["strict-transport-security"]).toContain("max-age=63072000");
	});
});

test.describe("home — Korean locale (ko)", () => {
	test("`/ko` renders the Korean message bundle", async ({ page }) => {
		await page.goto("/ko");

		await expect(
			page.getByRole("heading", { name: "공유 Contracts" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "디자인 시스템" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "프로젝트 이름 변경" }),
		).toBeVisible();
	});
});
