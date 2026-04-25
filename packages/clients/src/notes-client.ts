import {
	type CreateNoteInput,
	type Note,
	type NoteListQuery,
	type NoteListResponse,
	noteListResponseSchema,
	noteSchema,
	type UpdateNoteInput,
} from "@repo/contracts";
import { z } from "zod";
import type { createFetchClient } from "./fetch-client.js";

export type FetchClient = ReturnType<typeof createFetchClient>;

export function createNotesClient(fetchClient: FetchClient) {
	return {
		list(query: NoteListQuery): Promise<NoteListResponse> {
			const params = new URLSearchParams({
				page: String(query.page),
				pageSize: String(query.pageSize),
			});
			return fetchClient.request(`/notes?${params.toString()}`, {
				method: "GET",
				responseSchema: noteListResponseSchema,
			});
		},

		get(id: string): Promise<Note> {
			return fetchClient.request(`/notes/${encodeURIComponent(id)}`, {
				method: "GET",
				responseSchema: noteSchema,
			});
		},

		create(input: CreateNoteInput): Promise<Note> {
			return fetchClient.request("/notes", {
				method: "POST",
				body: input,
				responseSchema: noteSchema,
			});
		},

		update(id: string, input: UpdateNoteInput): Promise<Note> {
			return fetchClient.request(`/notes/${encodeURIComponent(id)}`, {
				method: "PATCH",
				body: input,
				responseSchema: noteSchema,
			});
		},

		async delete(id: string): Promise<void> {
			await fetchClient.request(`/notes/${encodeURIComponent(id)}`, {
				method: "DELETE",
				responseSchema: z.null().or(z.undefined()),
			});
		},
	};
}

export type NotesClient = ReturnType<typeof createNotesClient>;
