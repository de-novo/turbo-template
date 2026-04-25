import { loadMfeHostEnv } from "@repo/env/apps/mfe-host";
import { describe, expect, it } from "vitest";

describe("@repo/env/apps/mfe-host integration", () => {
	it("is reachable from this app and parses its own env contract", () => {
		const env = loadMfeHostEnv({
			VITE_MFE_HOST_ENV: "local",
			VITE_MFE_HOST_URL: "http://localhost:3100",
			VITE_MFE_DASHBOARD_MANIFEST_URL:
				"http://localhost:3101/mfe-manifest.dev.json",
		});
		expect(env.VITE_MFE_HOST_URL).toBe("http://localhost:3100");
	});
});
