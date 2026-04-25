import { loadWebEnv } from "@repo/env/apps/web";
import { describe, expect, it } from "vitest";

describe("@repo/env/apps/web integration", () => {
	it("is reachable from this app and parses its own env contract", () => {
		const env = loadWebEnv({
			NEXT_PUBLIC_APP_ENV: "local",
			NEXT_PUBLIC_API_URL: "http://localhost:4000",
		});
		expect(env.NEXT_PUBLIC_API_URL).toBe("http://localhost:4000");
		expect(env.NEXT_PUBLIC_AUTH_MODE).toBe("better-auth-embedded");
	});
});
