import { describe, expect, it } from "vitest";
import projectConfigJson from "../../../project.config.json" with {
	type: "json",
};
import { projectConfig } from "./index.js";

describe("projectConfig", () => {
	it("exposes the documented shape", () => {
		expect(projectConfig).toMatchObject({
			projectName: expect.any(String),
			projectSlug: expect.any(String),
			packageScope: expect.stringMatching(/^@/),
			projectTimezone: expect.any(String),
		});
	});

	it("matches project.config.json (single source of truth)", () => {
		expect(projectConfig).toEqual(projectConfigJson);
	});
});
