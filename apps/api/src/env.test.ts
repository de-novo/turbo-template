import { loadApiEnv } from "@repo/env/apps/api";
import { describe, expect, it } from "vitest";

describe("@repo/env/apps/api integration", () => {
	it("is reachable from this app and parses its own env contract", () => {
		const env = loadApiEnv({
			APP_ENV: "local",
			WEB_ORIGIN: "http://localhost:3000",
			PROJECT_NAME: "Fullstack TypeScript Template",
			PROJECT_SLUG: "fullstack-typescript-template",
			PROJECT_TIMEZONE: "Asia/Seoul",
		});
		expect(env.PORT).toBe(4000);
		expect(env.AUTH_MODE).toBe("better-auth-embedded");
	});
});
