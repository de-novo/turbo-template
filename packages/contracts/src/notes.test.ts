import { describe, expect, it } from "vitest";
import {
	createNoteInputSchema,
	noteSchema,
	updateNoteInputSchema,
} from "./notes.js";

describe("noteSchema", () => {
	it("accepts a well-formed note", () => {
		const now = new Date().toISOString();
		expect(
			noteSchema.parse({
				id: "note_1",
				ownerId: "user_1",
				title: "Shopping list",
				content: "Eggs, milk, bread",
				createdAt: now,
				updatedAt: now,
			}),
		).toMatchObject({ title: "Shopping list" });
	});

	it("rejects an empty title", () => {
		const now = new Date().toISOString();
		const result = noteSchema.safeParse({
			id: "note_1",
			ownerId: "user_1",
			title: "",
			content: "",
			createdAt: now,
			updatedAt: now,
		});
		expect(result.success).toBe(false);
	});
});

describe("createNoteInputSchema", () => {
	it("defaults content to empty string", () => {
		const parsed = createNoteInputSchema.parse({ title: "Draft" });
		expect(parsed.content).toBe("");
	});

	it("rejects title longer than 200 chars", () => {
		const result = createNoteInputSchema.safeParse({ title: "a".repeat(201) });
		expect(result.success).toBe(false);
	});
});

describe("updateNoteInputSchema", () => {
	it("requires at least one of title or content", () => {
		expect(updateNoteInputSchema.safeParse({}).success).toBe(false);
		expect(updateNoteInputSchema.safeParse({ title: "Updated" }).success).toBe(
			true,
		);
		expect(
			updateNoteInputSchema.safeParse({ content: "Updated body" }).success,
		).toBe(true);
	});
});
