import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMicroFrontendManifest } from "@repo/mfe";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

describe("dashboard manifests", () => {
	it("public/mfe-manifest.json validates against the shared schema", () => {
		const json = JSON.parse(
			readFileSync(resolve(here, "..", "public", "mfe-manifest.json"), "utf8"),
		);
		const manifest = parseMicroFrontendManifest(json);
		expect(manifest.name).toBe("dashboard");
		expect(manifest.elementTag).toBe("repo-mfe-dashboard");
	});

	it("public/mfe-manifest.dev.json validates against the shared schema", () => {
		const json = JSON.parse(
			readFileSync(
				resolve(here, "..", "public", "mfe-manifest.dev.json"),
				"utf8",
			),
		);
		const manifest = parseMicroFrontendManifest(json);
		expect(manifest.elementTag).toBe("repo-mfe-dashboard");
	});
});
