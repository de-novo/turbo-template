import { describe, expect, it } from "vitest";
import { designTokens } from "./tokens.js";

describe("designTokens", () => {
	it("exposes the documented top-level token groups", () => {
		expect(Object.keys(designTokens)).toEqual(
			expect.arrayContaining(["colors", "radius", "spacing"]),
		);
	});

	it("uses hex strings for colors", () => {
		for (const value of Object.values(designTokens.colors)) {
			expect(value).toMatch(/^#[0-9A-F]{6}$/i);
		}
	});

	it("uses px strings for radius and spacing", () => {
		for (const value of [
			...Object.values(designTokens.radius),
			...Object.values(designTokens.spacing),
		]) {
			expect(value).toMatch(/^\d+px$/);
		}
	});
});
