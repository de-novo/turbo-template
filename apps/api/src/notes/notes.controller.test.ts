import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppErrorFilter } from "../filters/app-error.filter.js";
import { NotesModule } from "./notes.module.js";

/**
 * Integration tests for /notes that exercise the full Nest router:
 *   ZodValidationPipe → controller → service → AppErrorFilter envelope.
 *
 * Bootstraps a minimal Nest app via `Test.createTestingModule(NotesModule)` and
 * registers `AppErrorFilter` globally so 404s map to the canonical error
 * envelope. No DB and no Better Auth — the notes module's in-memory store is
 * sufficient.
 */
describe("NotesController integration", () => {
  let app: import("@nestjs/common").INestApplication;
  let server: ReturnType<typeof app.getHttpServer>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [NotesModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AppErrorFilter());
    // Validation lives at the controller level via ZodValidationPipe (per
    // route); no global Nest pipe is registered. main.ts mirrors this.
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  test("GET /notes returns an empty paginated envelope on a fresh module", async () => {
    const res = await request(server).get("/notes");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pageInfo.totalItems).toBe(0);
  });

  test("POST /notes with a valid body returns 201 and persists the note", async () => {
    const create = await request(server)
      .post("/notes")
      .send({ title: "first", body: "hello" })
      .set("content-type", "application/json");
    expect(create.status).toBe(201);
    expect(create.body.ok).toBe(true);
    expect(create.body.data.title).toBe("first");
    const id = create.body.data.id;

    const fetched = await request(server).get(`/notes/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.id).toBe(id);
  });

  test("POST /notes with an empty body returns 400 via ZodValidationPipe + AppErrorFilter", async () => {
    const res = await request(server)
      .post("/notes")
      .send({})
      .set("content-type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  test("GET /notes/:id with an unknown id returns 404 envelope (AppError → toPublicError)", async () => {
    const res = await request(server).get("/notes/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("PUT /notes/:id merges fields and DELETE /notes/:id removes the note", async () => {
    const created = await request(server)
      .post("/notes")
      .send({ title: "old", body: "" })
      .set("content-type", "application/json");
    const id = created.body.data.id;

    const updated = await request(server)
      .put(`/notes/${id}`)
      .send({ title: "new" })
      .set("content-type", "application/json");
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe("new");

    const removed = await request(server).delete(`/notes/${id}`);
    expect(removed.status).toBe(204);

    const after = await request(server).get(`/notes/${id}`);
    expect(after.status).toBe(404);
  });
});
