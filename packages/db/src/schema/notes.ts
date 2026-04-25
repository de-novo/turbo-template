import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-users.js";

export const note = pgTable(
	"note",
	{
		id: text("id").primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		content: text("content").notNull().default(""),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("note_owner_id_idx").on(table.ownerId),
		index("note_owner_id_created_at_idx").on(table.ownerId, table.createdAt),
	],
);

export type NoteRow = typeof note.$inferSelect;
export type NewNoteRow = typeof note.$inferInsert;
