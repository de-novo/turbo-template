import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { UserIdentity } from "@repo/auth";
import {
	type ApiResponse,
	type CreateNoteInput,
	createNoteInputSchema,
	type Note,
	type NoteListQuery,
	type NoteListResponse,
	noteListQuerySchema,
	type UpdateNoteInput,
	updateNoteInputSchema,
} from "@repo/contracts";
import { AuthGuard } from "../auth/auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { NotesService } from "./notes.service.js";

@ApiTags("notes")
@Controller("notes")
@UseGuards(AuthGuard)
export class NotesController {
	constructor(private readonly notes: NotesService) {}

	@Get()
	async list(
		@CurrentUser() user: UserIdentity,
		@Query(new ZodValidationPipe(noteListQuerySchema)) query: NoteListQuery,
	): Promise<ApiResponse<NoteListResponse>> {
		return { ok: true, data: await this.notes.list(user.userId, query) };
	}

	@Get(":id")
	async get(
		@CurrentUser() user: UserIdentity,
		@Param("id") id: string,
	): Promise<ApiResponse<Note>> {
		return { ok: true, data: await this.notes.get(user.userId, id) };
	}

	@Post()
	@HttpCode(201)
	async create(
		@CurrentUser() user: UserIdentity,
		@Body(new ZodValidationPipe(createNoteInputSchema)) input: CreateNoteInput,
	): Promise<ApiResponse<Note>> {
		return { ok: true, data: await this.notes.create(user.userId, input) };
	}

	@Patch(":id")
	async update(
		@CurrentUser() user: UserIdentity,
		@Param("id") id: string,
		@Body(new ZodValidationPipe(updateNoteInputSchema)) input: UpdateNoteInput,
	): Promise<ApiResponse<Note>> {
		return { ok: true, data: await this.notes.update(user.userId, id, input) };
	}

	@Delete(":id")
	@HttpCode(204)
	async delete(
		@CurrentUser() user: UserIdentity,
		@Param("id") id: string,
	): Promise<void> {
		await this.notes.delete(user.userId, id);
	}
}
