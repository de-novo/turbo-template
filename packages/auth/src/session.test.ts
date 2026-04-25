import { describe, expect, it } from "vitest";
import { permissions, roles } from "./permissions.js";
import { sessionSchema } from "./session.js";

describe("sessionSchema", () => {
	it("parses a valid session", () => {
		const parsed = sessionSchema.parse({
			sessionId: "sess_123",
			user: {
				userId: "01HVZ7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7",
				email: "user@example.com",
				memberships: [],
			},
			expiresAt: "2030-01-01T00:00:00.000Z",
			permissions: [permissions.licenseRead],
		});
		expect(parsed.user.email).toBe("user@example.com");
		expect(parsed.permissions).toEqual([permissions.licenseRead]);
	});

	it("rejects an invalid email", () => {
		const result = sessionSchema.safeParse({
			sessionId: "sess_123",
			user: {
				userId: "01HVZ7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7",
				email: "not-an-email",
				memberships: [],
			},
			expiresAt: "2030-01-01T00:00:00.000Z",
		});
		expect(result.success).toBe(false);
	});

	it("exposes the documented role constants", () => {
		expect(Object.values(roles)).toContain("owner");
		expect(Object.values(roles)).toContain("viewer");
	});
});
