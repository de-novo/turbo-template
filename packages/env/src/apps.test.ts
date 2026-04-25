import { describe, expect, it } from "vitest";
import { loadApiEnv, pickSocialProviders } from "./apps/api.js";
import { loadDesktopEnv } from "./apps/desktop.js";
import { loadMfeHostEnv } from "./apps/mfe-host.js";
import { loadMobileEnv } from "./apps/mobile.js";
import { loadWebEnv } from "./apps/web.js";

describe("loadApiEnv", () => {
	it("parses a valid local environment", () => {
		const env = loadApiEnv({
			APP_ENV: "local",
			NODE_ENV: "development",
			PORT: "4000",
			PROJECT_NAME: "Fullstack TypeScript Template",
			PROJECT_SLUG: "fullstack-typescript-template",
			PROJECT_TIMEZONE: "Asia/Seoul",
			WEB_ORIGIN: "http://localhost:3000",
		});
		expect(env.PORT).toBe(4000);
		expect(env.WEB_ORIGIN).toBe("http://localhost:3000");
		expect(env.AUTH_MODE).toBe("better-auth-embedded");
	});

	it("rejects foreign keys (NEXT_PUBLIC_ in api)", () => {
		expect(() =>
			loadApiEnv({
				NEXT_PUBLIC_API_URL: "http://localhost:4000",
			}),
		).toThrow(/foreign or secret key/);
	});

	it("requires DATABASE_URL and BETTER_AUTH_SECRET in production for embedded auth", () => {
		const result = (() => {
			try {
				loadApiEnv({
					APP_ENV: "production",
					NODE_ENV: "production",
				});
				return { ok: true };
			} catch (error) {
				return { ok: false, error: error as Error };
			}
		})();
		expect(result.ok).toBe(false);
	});
});

describe("pickSocialProviders", () => {
	it("activates only providers whose id+secret are both set", () => {
		const env = loadApiEnv({
			APP_ENV: "local",
			WEB_ORIGIN: "http://localhost:3000",
			GOOGLE_CLIENT_ID: "g-id",
			GOOGLE_CLIENT_SECRET: "g-secret",
			GITHUB_CLIENT_ID: "gh-id",
		});
		const providers = pickSocialProviders(env);
		expect(providers.google).toEqual({
			clientId: "g-id",
			clientSecret: "g-secret",
		});
		expect(providers.github).toBeUndefined();
	});
});

describe("loadWebEnv", () => {
	it("defaults the API URL when not provided", () => {
		const env = loadWebEnv({});
		expect(env.NEXT_PUBLIC_API_URL).toBe("http://localhost:4000");
	});

	it("rejects DATABASE_URL leaking into the web bundle", () => {
		expect(() => loadWebEnv({ DATABASE_URL: "postgres://x" })).toThrow(
			/foreign or secret key/,
		);
	});
});

describe("loadDesktopEnv", () => {
	it("parses VITE_* keys", () => {
		const env = loadDesktopEnv({
			VITE_APP_ENV: "local",
			VITE_API_URL: "http://localhost:4000",
			VITE_DESKTOP_URL: "http://localhost:3001",
		});
		expect(env.VITE_API_URL).toBe("http://localhost:4000");
	});
});

describe("loadMobileEnv", () => {
	it("parses EXPO_PUBLIC_* keys", () => {
		const env = loadMobileEnv({
			EXPO_PUBLIC_APP_ENV: "local",
			EXPO_PUBLIC_API_URL: "http://localhost:4000",
			EXPO_PUBLIC_MOBILE_URL: "http://localhost:8081",
		});
		expect(env.EXPO_PUBLIC_API_URL).toBe("http://localhost:4000");
	});
});

describe("loadMfeHostEnv", () => {
	it("parses VITE_MFE_* keys", () => {
		const env = loadMfeHostEnv({
			VITE_MFE_HOST_ENV: "local",
			VITE_MFE_HOST_URL: "http://localhost:3100",
			VITE_MFE_DASHBOARD_MANIFEST_URL:
				"http://localhost:3101/mfe-manifest.dev.json",
		});
		expect(env.VITE_MFE_HOST_URL).toBe("http://localhost:3100");
	});
});
