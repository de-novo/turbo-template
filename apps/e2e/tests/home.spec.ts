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
test.describe("home", () => {
	test("renders the template title and the three baseline cards", async ({
		page,
	}) => {
		await page.goto("/");

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
		const response = await request.get("/");
		const headers = response.headers();
		expect(headers["x-frame-options"]).toBe("DENY");
		expect(headers["x-content-type-options"]).toBe("nosniff");
		expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
		expect(headers["strict-transport-security"]).toContain("max-age=63072000");
	});
});
