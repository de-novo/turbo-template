import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  type ApiResponse,
  createNoteBodySchema,
  type ListNotesQuery,
  listNotesQuerySchema,
  type Note,
  type Paginated,
  updateNoteBodySchema,
} from "@repo/contracts";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { NotesService } from "./notes.service.js";

const createNotePipe = new ZodValidationPipe(createNoteBodySchema);
const updateNotePipe = new ZodValidationPipe(updateNoteBodySchema);
const listNotesPipe = new ZodValidationPipe(listNotesQuerySchema);

@Controller("/notes")
export class NotesController {
  // tsx (used for `pnpm dev`) does not emit `design:paramtypes` metadata, so
  // class-based Nest DI cannot auto-resolve the constructor parameter. Make
  // the binding explicit via `@Inject(NotesService)` so dev and prod (tsc-built)
  // both work.
  constructor(@Inject(NotesService) private readonly notes: NotesService) {}

  @Get()
  list(@Query(listNotesPipe) query: ListNotesQuery): ApiResponse<Paginated<Note>> {
    const { items, total } = this.notes.list(query);
    return {
      ok: true,
      data: {
        items,
        pageInfo: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: total,
          totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
        },
      },
    };
  }

  @Get(":id")
  get(@Param("id") id: string): ApiResponse<Note> {
    return { ok: true, data: this.notes.get(id) };
  }

  @Post()
  @HttpCode(201)
  create(@Body(createNotePipe) body: { title: string; body: string }): ApiResponse<Note> {
    return { ok: true, data: this.notes.create(body) };
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body(updateNotePipe) body: { title?: string; body?: string },
  ): ApiResponse<Note> {
    return { ok: true, data: this.notes.update(id, body) };
  }

  @Delete(":id")
  @HttpCode(204)
  delete(@Param("id") id: string): void {
    this.notes.delete(id);
  }
}
