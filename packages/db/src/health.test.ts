import { describe, expect, it } from "vitest";
import { databaseNotConfigured } from "./health.js";
import * as schema from "./schema/index.js";

describe("@repo/db", () => {
	it("exports the documented schema tables", () => {
		expect(schema.user).toBeDefined();
		expect(schema.session).toBeDefined();
		expect(schema.note).toBeDefined();
	});

	it("exposes the databaseNotConfigured sentinel for app-level health responses", () => {
		expect(databaseNotConfigured).toBeDefined();
	});
});
