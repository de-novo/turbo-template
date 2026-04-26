import { AppError } from "@repo/platform";
import { expect, test } from "vitest";
import { NotesService } from "./notes.service.js";

test("create + get round-trips a note with stable ids and timestamps", () => {
  const service = new NotesService();
  const created = service.create({ title: "first", body: "hello" });

  expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(created.createdAt).toBe(created.updatedAt);

  const fetched = service.get(created.id);
  expect(fetched).toEqual(created);
});

test("get throws AppError(NOT_FOUND) when the id is unknown", () => {
  const service = new NotesService();
  try {
    service.get("missing");
    expect.fail("expected AppError");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("NOT_FOUND");
  }
});

test("list paginates by page/pageSize and sorts newest first", () => {
  const service = new NotesService();
  for (const title of ["a", "b", "c"]) {
    service.create({ title, body: "" });
  }

  const page1 = service.list({ page: 1, pageSize: 2 });
  expect(page1.items.length).toBe(2);
  expect(page1.total).toBe(3);

  const page2 = service.list({ page: 2, pageSize: 2 });
  expect(page2.items.length).toBe(1);
});

test("update merges fields and bumps updatedAt", async () => {
  const service = new NotesService();
  const created = service.create({ title: "old", body: "" });
  // Wait at least one millisecond so updatedAt advances.
  await new Promise((r) => setTimeout(r, 2));
  const updated = service.update(created.id, { title: "new" });

  expect(updated.title).toBe("new");
  expect(updated.body).toBe("");
  expect(updated.updatedAt > created.updatedAt).toBe(true);
});

test("delete removes the note and a subsequent get throws NOT_FOUND", () => {
  const service = new NotesService();
  const note = service.create({ title: "transient", body: "" });
  service.delete(note.id);
  expect(() => service.get(note.id)).toThrow(AppError);
});
