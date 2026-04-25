import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type {
	CreateNoteInput,
	Note,
	NoteListQuery,
	NoteListResponse,
	UpdateNoteInput,
} from "@repo/contracts";
import { type DatabaseClient, note } from "@repo/db";
import { AppError } from "@repo/platform";
import { and, desc, eq, sql } from "drizzle-orm";
import { DATABASE_CLIENT } from "../db/db.tokens.js";

@Injectable()
export class NotesService {
	constructor(
		@Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient,
	) {}

	async list(ownerId: string, query: NoteListQuery): Promise<NoteListResponse> {
		const offset = (query.page - 1) * query.pageSize;
		const { db } = this.dbClient;

		const [items, totals] = await Promise.all([
			db
				.select()
				.from(note)
				.where(eq(note.ownerId, ownerId))
				.orderBy(desc(note.createdAt))
				.limit(query.pageSize)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(note)
				.where(eq(note.ownerId, ownerId)),
		]);

		const totalItems = totals[0]?.count ?? 0;

		return {
			items: items.map(toNote),
			pageInfo: {
				page: query.page,
				pageSize: query.pageSize,
				totalItems,
				totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
			},
		};
	}

	async get(ownerId: string, noteId: string): Promise<Note> {
		const { db } = this.dbClient;
		const rows = await db
			.select()
			.from(note)
			.where(and(eq(note.id, noteId), eq(note.ownerId, ownerId)))
			.limit(1);

		const row = rows[0];
		if (!row) {
			throw new AppError({ code: "NOT_FOUND", message: "Note not found." });
		}
		return toNote(row);
	}

	async create(ownerId: string, input: CreateNoteInput): Promise<Note> {
		const { db } = this.dbClient;
		const id = randomUUID();
		const [row] = await db
			.insert(note)
			.values({
				id,
				ownerId,
				title: input.title,
				content: input.content,
			})
			.returning();
		if (!row) {
			throw new AppError({
				code: "INTERNAL",
				message: "Failed to create note.",
			});
		}
		return toNote(row);
	}

	async update(
		ownerId: string,
		noteId: string,
		input: UpdateNoteInput,
	): Promise<Note> {
		const { db } = this.dbClient;
		const patch: Partial<typeof note.$inferInsert> = { updatedAt: new Date() };
		if (input.title !== undefined) patch.title = input.title;
		if (input.content !== undefined) patch.content = input.content;

		const [row] = await db
			.update(note)
			.set(patch)
			.where(and(eq(note.id, noteId), eq(note.ownerId, ownerId)))
			.returning();

		if (!row) {
			throw new AppError({ code: "NOT_FOUND", message: "Note not found." });
		}
		return toNote(row);
	}

	async delete(ownerId: string, noteId: string): Promise<void> {
		const { db } = this.dbClient;
		const result = await db
			.delete(note)
			.where(and(eq(note.id, noteId), eq(note.ownerId, ownerId)))
			.returning({ id: note.id });

		if (result.length === 0) {
			throw new AppError({ code: "NOT_FOUND", message: "Note not found." });
		}
	}
}

function toNote(row: typeof note.$inferSelect): Note {
	return {
		id: row.id,
		ownerId: row.ownerId,
		title: row.title,
		content: row.content,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}
