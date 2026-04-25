import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env["E2E_WEB_URL"] ?? "http://localhost:3000";
const PROJECT_ROOT = "../..";

/**
 * Playwright config tuned for the template's local-dev shape:
 *
 * - `webServer` boots `pnpm dev:web` from the repo root automatically.
 *   Set `E2E_NO_WEB_SERVER=1` when targeting a deployed preview.
 *   On CI, retries pick up and only chromium runs by default
 *   (cross-browser passes are the fork's call).
 * - `baseURL` is overridable via `E2E_WEB_URL` so the same suite runs
 *   against a deployed preview without changes.
 * - Traces and screenshots only on first retry to keep CI artifacts
 *   small; flip to `on` while debugging locally.
 */
const baseConfig = {
	testDir: "./tests",
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env["CI"],
	retries: process.env["CI"] ? 2 : 0,
	reporter: process.env["CI"] ? "github" : ("list" as const),
	use: {
		baseURL: WEB_URL,
		trace: "on-first-retry" as const,
		screenshot: "only-on-failure" as const,
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		// Add firefox / webkit / mobile-chrome here when your matrix needs
		// them — extra projects multiply CI time and rarely catch bugs
		// the chromium pass missed.
	],
};

export default defineConfig(
	process.env["E2E_NO_WEB_SERVER"]
		? baseConfig
		: {
				...baseConfig,
				webServer: {
					command: "pnpm dev:web",
					url: WEB_URL,
					cwd: PROJECT_ROOT,
					reuseExistingServer: !process.env["CI"],
					timeout: 120_000,
				},
			},
);
