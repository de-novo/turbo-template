import { describe, expect, it } from "vitest";
import {
	parseMicroFrontendManifest,
	resolveRemoteEntryUrl,
} from "./manifest.js";
import {
	createMicroFrontendReadyEvent,
	microFrontendEventNames,
} from "./runtime-events.js";

describe("parseMicroFrontendManifest", () => {
	it("accepts a valid manifest", () => {
		const m = parseMicroFrontendManifest({
			elementTag: "repo-mfe-dashboard",
			entry: "/remote-entry.js",
			name: "dashboard",
			version: "0.0.0",
		});
		expect(m.name).toBe("dashboard");
	});

	it("rejects an invalid elementTag", () => {
		expect(() =>
			parseMicroFrontendManifest({
				elementTag: "INVALID",
				entry: "/remote-entry.js",
				name: "x",
				version: "0",
			}),
		).toThrow();
	});
});

describe("resolveRemoteEntryUrl", () => {
	it("resolves the entry path against the manifest URL", () => {
		const url = resolveRemoteEntryUrl(
			"https://cdn.example.com/dashboard/mfe-manifest.json",
			{
				elementTag: "repo-mfe-dashboard",
				entry: "/remote-entry.js",
				name: "dashboard",
				version: "0.0.0",
			},
		);
		expect(url).toBe("https://cdn.example.com/remote-entry.js");
	});
});

describe("microFrontendEventNames", () => {
	it("uses repo-prefixed event names", () => {
		expect(microFrontendEventNames.ready).toBe("repo:mfe:ready");
		expect(microFrontendEventNames.error).toBe("repo:mfe:error");
	});
});

describe("createMicroFrontendReadyEvent", () => {
	it("dispatches with bubbles + composed for cross-shadow propagation", () => {
		const event = createMicroFrontendReadyEvent({
			elementTag: "repo-mfe-dashboard",
			name: "dashboard",
			version: "0.0.0",
		});
		expect(event.type).toBe(microFrontendEventNames.ready);
		expect(event.bubbles).toBe(true);
		expect(event.composed).toBe(true);
	});
});
