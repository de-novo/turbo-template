import { describe, expect, it } from "vitest";
import { toContractSession } from "./session.js";

describe("toContractSession", () => {
	it("returns null when the raw session is missing", () => {
		expect(toContractSession(null as never)).toBeNull();
	});

	it("returns null when user or session is absent", () => {
		expect(
			toContractSession({
				session: null,
				user: null,
			} as never),
		).toBeNull();
	});

	it("maps a Better Auth session into the shared contract", () => {
		const raw = {
			session: {
				id: "sess_123",
				expiresAt: new Date("2030-01-01T00:00:00.000Z"),
			},
			user: {
				id: "01HVZ7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7",
				email: "user@example.com",
				name: "Jane",
			},
		};
		const session = toContractSession(raw as never);
		expect(session).not.toBeNull();
		expect(session?.user.email).toBe("user@example.com");
		expect(session?.user.name).toBe("Jane");
		expect(session?.expiresAt).toBe("2030-01-01T00:00:00.000Z");
		expect(session?.permissions).toEqual([]);
	});
});
