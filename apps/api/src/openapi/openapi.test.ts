import { noteSchema } from "@repo/contracts";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { buildOpenApiDocument } from "./openapi.config.js";

const env = {
  PROJECT_NAME: "Test API",
  PROJECT_SLUG: "test-api",
  PORT: 4000,
  AUTH_MODE: "better-auth-embedded" as const,
  OTEL_SERVICE_VERSION: "0.0.0-test",
};

describe("buildOpenApiDocument", () => {
  const doc = buildOpenApiDocument(env as never) as {
    openapi: string;
    paths: Record<string, unknown>;
    components: { schemas: Record<string, unknown> };
  };

  it("declares OpenAPI 3.1", () => {
    expect(doc.openapi).toBe("3.1.0");
  });

  it("documents the Notes CRUD surface", () => {
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/notes", "/notes/{id}"]));
  });

  it("includes the Better Auth surface only when enabled", () => {
    expect(doc.paths["/api/auth/{path}"]).toBeDefined();
    const offDoc = buildOpenApiDocument({ ...env, AUTH_MODE: "external" } as never) as {
      paths: Record<string, unknown>;
    };
    expect(offDoc.paths["/api/auth/{path}"]).toBeUndefined();
  });

  it("the Note schema in the doc matches z.toJSONSchema(noteSchema)", () => {
    const expected = z.toJSONSchema(noteSchema, { target: "draft-2020-12" }) as Record<
      string,
      unknown
    >;
    delete expected["$schema"];
    expect(doc.components.schemas.Note).toEqual(expected);
  });
});
