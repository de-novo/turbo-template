import { Test } from "@nestjs/testing";
import { toNodeHandler } from "better-auth/node";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppErrorFilter } from "../filters/app-error.filter.js";
import { MeModule } from "./me.module.js";

/**
 * Integration tests for GET /me. Exercises AuthenticatedGuard + @CurrentUser()
 * end-to-end against the in-process Better Auth memory adapter:
 *   - request without a session → 401 envelope
 *   - request with a valid session cookie → 200 + user payload
 *
 * Better Auth is also mounted on the test app's underlying Express adapter so
 * we can sign up via /api/auth and reuse the cookie on /me.
 */
describe("MeController integration", () => {
  let app: import("@nestjs/common").INestApplication;
  let server: ReturnType<typeof app.getHttpServer>;

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = "test-only-not-real-secret-must-be-32";
    process.env.BETTER_AUTH_URL = "http://127.0.0.1";

    const moduleRef = await Test.createTestingModule({
      imports: [MeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AppErrorFilter());

    // Mount Better Auth on the same Express instance so /api/auth/sign-up/email
    // and the @AuthenticatedGuard share a session store.
    const { AUTH_INSTANCE } = await import("../auth/auth.module.js");
    const authInstance = app.get(AUTH_INSTANCE) as ReturnType<
      typeof import("../auth/auth.js").createAuth
    > | null;
    if (!authInstance) throw new Error("AUTH_INSTANCE was null in test setup");
    app.getHttpAdapter().getInstance().all("/api/auth/*splat", toNodeHandler(authInstance));

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  test("GET /me without a session returns the UNAUTHORIZED envelope", async () => {
    const res = await request(server).get("/me");
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("GET /me with a valid session cookie returns the user payload", async () => {
    const email = `me-${Date.now()}@example.test`;
    const signup = await request(server)
      .post("/api/auth/sign-up/email")
      .set("content-type", "application/json")
      .send({ email, password: "long-enough-password-here", name: "Me Test" });
    expect(signup.status).toBe(200);

    const rawCookies = signup.headers["set-cookie"];
    const cookieHeader = (Array.isArray(rawCookies) ? rawCookies : [rawCookies])
      .map((c) => c.split(";")[0])
      .join("; ");

    const me = await request(server).get("/me").set("cookie", cookieHeader);
    expect(me.status).toBe(200);
    expect(me.body.ok).toBe(true);
    expect(me.body.data.email).toBe(email);
    expect(me.body.data.name).toBe("Me Test");
    expect(typeof me.body.data.id).toBe("string");
  });
});
