import { loadApiEnv } from "@repo/env/apps/api";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createAuth } from "./auth.js";

/**
 * Integration test for the Better Auth runtime mount. Spins up a minimal
 * Express app with the same `/api/auth/*splat` mount used by main.ts and
 * verifies the email/password flow against the in-process memory adapter
 * (no DB required). The same path runs against the Drizzle adapter when
 * DATABASE_URL is set; both adapters expose the same Better Auth REST surface.
 */
describe("Better Auth runtime (memory adapter)", () => {
  const env = loadApiEnv({
    BETTER_AUTH_SECRET: "test-only-not-real-secret-must-be-32",
    BETTER_AUTH_URL: "http://127.0.0.1",
    PORT: "4000",
  });
  let app: express.Express;

  beforeAll(() => {
    app = express();
    const auth = createAuth(env);
    app.all("/api/auth/*splat", toNodeHandler(auth));
  });

  afterAll(() => {
    // express has no close hook; supertest's agent shuts itself down.
  });

  test("GET /api/auth/get-session returns null for an unauthenticated request", async () => {
    const res = await request(app).get("/api/auth/get-session");
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  test("POST /api/auth/sign-up/email creates a user and issues a session cookie", async () => {
    const email = `alice-${Date.now()}@example.test`;
    const signup = await request(app)
      .post("/api/auth/sign-up/email")
      .set("content-type", "application/json")
      .send({ email, password: "long-enough-password-here", name: "Alice" });

    expect(signup.status).toBe(200);
    expect(signup.body.token).toEqual(expect.any(String));
    expect(signup.body.user.email).toBe(email);

    const cookies = signup.headers["set-cookie"];
    expect(Array.isArray(cookies) ? cookies : [cookies]).toEqual(
      expect.arrayContaining([expect.stringContaining("better-auth.session_token=")]),
    );
  });

  test("a signed-up user's session is readable via /api/auth/get-session with the cookie", async () => {
    const email = `bob-${Date.now()}@example.test`;
    const signup = await request(app)
      .post("/api/auth/sign-up/email")
      .set("content-type", "application/json")
      .send({ email, password: "long-enough-password-here", name: "Bob" });
    expect(signup.status).toBe(200);

    const rawCookies = signup.headers["set-cookie"];
    const cookieHeader = (Array.isArray(rawCookies) ? rawCookies : [rawCookies])
      .map((c) => c.split(";")[0])
      .join("; ");

    const session = await request(app).get("/api/auth/get-session").set("cookie", cookieHeader);
    expect(session.status).toBe(200);
    expect(session.body?.user?.email).toBe(email);
  });
});
