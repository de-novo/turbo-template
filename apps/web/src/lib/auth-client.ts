"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client. Talks to `/api/auth/*` which Next.js rewrites
 * to the API. Same-origin calls keep cookies simple (no CORS, no explicit
 * `credentials: include`).
 *
 * In production, configure `NEXT_PUBLIC_API_URL` to the API origin and the
 * Next rewrite forwards there. The cookie still ends up on the web origin
 * because the rewrite happens server-side.
 */
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost:3000" : window.location.origin,
});

export const { useSession, signIn, signUp, signOut } = authClient;
