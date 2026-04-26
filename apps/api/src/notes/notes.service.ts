import { Injectable } from "@nestjs/common";
import type { CreateNoteBody, ListNotesQuery, Note, UpdateNoteBody } from "@repo/contracts";
import { AppError } from "@repo/platform";

/**
 * Reference domain service. The store is in-memory so this module compiles and
 * runs without `DATABASE_URL`. Real product modules replace `notes` with a
 * Drizzle-backed table and inject the `@repo/db` client through DI.
 */
@Injectable()
export class NotesService {
  private readonly store = new Map<string, Note>();

  list(query: ListNotesQuery): { items: Note[]; total: number } {
    const all = Array.from(this.store.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    const start = (query.page - 1) * query.pageSize;
    const items = all.slice(start, start + query.pageSize);
    return { items, total: all.length };
  }

  get(id: string): Note {
    const note = this.store.get(id);
    if (!note) {
      throw new AppError({
        code: "NOT_FOUND",
        message: `Note ${id} not found.`,
        details: { id },
      });
    }
    return note;
  }

  create(body: CreateNoteBody): Note {
    const now = new Date().toISOString();
    const note: Note = {
      id: crypto.randomUUID(),
      title: body.title,
      body: body.body,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(note.id, note);
    return note;
  }

  update(id: string, body: UpdateNoteBody): Note {
    const existing = this.get(id);
    const next: Note = {
      ...existing,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.body !== undefined ? { body: body.body } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, next);
    return next;
  }

  delete(id: string): void {
    if (!this.store.delete(id)) {
      throw new AppError({
        code: "NOT_FOUND",
        message: `Note ${id} not found.`,
        details: { id },
      });
    }
  }
}
