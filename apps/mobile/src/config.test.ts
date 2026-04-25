import { projectConfig } from "@repo/config";
import { describe, expect, it } from "vitest";

describe("@repo/config integration", () => {
	it("resolves projectConfig from the workspace JSON", () => {
		expect(projectConfig.projectName).toEqual(expect.any(String));
		expect(projectConfig.projectSlug).toMatch(/^[a-z0-9-]+$/);
		expect(projectConfig.packageScope).toMatch(/^@/);
	});
});
