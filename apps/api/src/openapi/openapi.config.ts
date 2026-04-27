import {
  apiResponseSchema,
  createNoteBodySchema,
  errorCodeSchema,
  listNotesQuerySchema,
  noteSchema,
  paginatedSchema,
  publicErrorSchema,
  updateNoteBodySchema,
} from "@repo/contracts";
import type { ApiEnv } from "@repo/env/apps/api";
import { z, type ZodType } from "zod";

/**
 * Builds the OpenAPI 3.1 document from the Zod schemas in @repo/contracts plus
 * route metadata that mirrors the NestJS controllers. Uses Zod 4's built-in
 * `z.toJSONSchema` (draft-2020-12), which OpenAPI 3.1 accepts directly. Re-runs
 * on each /openapi.json fetch (cheap; pure schema → JSON conversion).
 *
 * Better Auth's /api/auth/* surface is documented as a single opaque path
 * because the upstream surface is large, mostly auto-generated, and best
 * documented via Better Auth's own /api/auth/reference page.
 */
export function buildOpenApiDocument(env: ApiEnv): unknown {
  const toSchema = (schema: ZodType): Record<string, unknown> => {
    const json = z.toJSONSchema(schema, { target: "draft-2020-12" }) as Record<string, unknown>;
    // OpenAPI rejects the top-level $schema keyword.
    delete json["$schema"];
    return json;
  };

  const components = {
    schemas: {
      Note: toSchema(noteSchema),
      CreateNoteBody: toSchema(createNoteBodySchema),
      UpdateNoteBody: toSchema(updateNoteBodySchema),
      ListNotesQuery: toSchema(listNotesQuerySchema),
      PaginatedNotes: toSchema(paginatedSchema(noteSchema)),
      ApiResponseNote: toSchema(apiResponseSchema(noteSchema)),
      ApiResponsePaginatedNotes: toSchema(apiResponseSchema(paginatedSchema(noteSchema))),
      PublicError: toSchema(publicErrorSchema),
      ErrorCode: toSchema(errorCodeSchema),
    },
  };

  const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const jsonResponse = (description: string, schemaRef: string) => ({
    description,
    content: { "application/json": { schema: ref(schemaRef) } },
  });

  const paths: Record<string, Record<string, unknown>> = {
    "/notes": {
      get: {
        tags: ["notes"],
        summary: "List notes (paginated).",
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          "200": jsonResponse("Paginated list of notes.", "ApiResponsePaginatedNotes"),
          "400": jsonResponse("Invalid query.", "PublicError"),
        },
      },
      post: {
        tags: ["notes"],
        summary: "Create a note.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("CreateNoteBody") } },
        },
        responses: {
          "201": jsonResponse("Created note.", "ApiResponseNote"),
          "400": jsonResponse("Validation failed.", "PublicError"),
        },
      },
    },
    "/notes/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      get: {
        tags: ["notes"],
        summary: "Get a note by id.",
        responses: {
          "200": jsonResponse("A single note.", "ApiResponseNote"),
          "404": jsonResponse("Note not found.", "PublicError"),
        },
      },
      put: {
        tags: ["notes"],
        summary: "Update a note.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("UpdateNoteBody") } },
        },
        responses: {
          "200": jsonResponse("Updated note.", "ApiResponseNote"),
          "400": jsonResponse("Validation failed.", "PublicError"),
          "404": jsonResponse("Note not found.", "PublicError"),
        },
      },
      delete: {
        tags: ["notes"],
        summary: "Delete a note.",
        responses: {
          "204": { description: "Note deleted; no body." },
          "404": jsonResponse("Note not found.", "PublicError"),
        },
      },
    },
    "/health/live": {
      get: {
        tags: ["health"],
        summary: "Liveness probe.",
        responses: {
          "200": {
            description: "API process is up.",
            content: {
              "application/json": {
                schema: { type: "object", properties: { ok: { const: true } }, required: ["ok"] },
              },
            },
          },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["health"],
        summary: "Readiness probe (checks dependencies).",
        responses: {
          "200": { description: "API + dependencies are reachable." },
          "503": { description: "A required dependency (e.g. database) is unreachable." },
        },
      },
    },
    "/metrics": {
      get: {
        tags: ["observability"],
        summary: "Prometheus exposition.",
        responses: {
          "200": {
            description: "Prometheus exposition format.",
            content: { "text/plain": { schema: { type: "string" } } },
          },
        },
      },
    },
  };

  if (env.AUTH_MODE === "better-auth-embedded") {
    paths["/me"] = {
      get: {
        tags: ["auth"],
        summary: "Authenticated user (demo of AuthenticatedGuard + @CurrentUser).",
        responses: {
          "200": {
            description: "The current user.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { const: true },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string", format: "email" },
                        name: { type: "string" },
                      },
                      required: ["id", "email"],
                    },
                  },
                  required: ["ok", "data"],
                },
              },
            },
          },
          "401": jsonResponse("No active session.", "PublicError"),
        },
      },
    };
    paths["/api/auth/{path}"] = {
      parameters: [{ name: "path", in: "path", required: true, schema: { type: "string" } }],
      get: {
        tags: ["auth"],
        summary: "Better Auth (managed). See https://better-auth.com/docs for the full surface.",
        responses: {
          "200": { description: "Better Auth response. Shape depends on the operation." },
        },
      },
      post: {
        tags: ["auth"],
        summary: "Better Auth (managed). Sign-up, sign-in, sign-out, etc.",
        responses: {
          "200": { description: "Better Auth response. Shape depends on the operation." },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${env.PROJECT_NAME} API`,
      version: env.OTEL_SERVICE_VERSION ?? "0.0.0",
      description:
        "Generated from @repo/contracts Zod schemas via z.toJSONSchema. Source of truth lives in the workspace; do not hand-edit the served document.",
    },
    servers: [{ url: `http://localhost:${env.PORT}` }],
    paths,
    components,
    tags: [
      { name: "notes", description: "Notes domain example." },
      { name: "health", description: "Liveness and readiness probes." },
      { name: "observability", description: "Metrics and tracing endpoints." },
      { name: "auth", description: "Better Auth managed surface (when enabled)." },
    ],
  };
}
