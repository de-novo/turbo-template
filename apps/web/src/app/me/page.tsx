"use client";

import { AppShell, EmptyState } from "@repo/design-system";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "../../lib/auth-client";

type MePayload = {
  ok: true;
  data: { id: string; email: string; name?: string };
};

/**
 * Reference page that exercises the protected GET /me route. Reads the session
 * via Better Auth's `useSession` hook (cookie-based; same-origin via the
 * Next.js rewrite to /api/auth/*) and double-checks by hitting /api/me, which
 * is rewritten to the API's `AuthenticatedGuard`-protected endpoint.
 */
export default function MePage() {
  const router = useRouter();
  const session = useSession();
  const [me, setMe] = useState<MePayload["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok) {
          setError(`/api/me returned ${res.status}`);
          return;
        }
        const body = (await res.json()) as MePayload;
        if (!cancelled) setMe(body.data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load /api/me");
      }
    }
    if (session.data) void load();
    return () => {
      cancelled = true;
    };
  }, [session.data]);

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  if (session.isPending) {
    return (
      <AppShell description="Loading session…" title="Account">
        <p className="text-slate-600 text-sm">Checking session…</p>
      </AppShell>
    );
  }

  if (!session.data) {
    return (
      <AppShell description="No active session." title="Account">
        <EmptyState
          description="Sign in or create an account to see your profile."
          title="Not signed in"
        />
        <div className="mt-4 flex gap-3">
          <a
            className="rounded bg-slate-900 px-4 py-2 font-medium text-sm text-white"
            href="/sign-in"
          >
            Sign in
          </a>
          <a
            className="rounded border border-slate-300 px-4 py-2 font-medium text-sm"
            href="/sign-up"
          >
            Create account
          </a>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      description="Authenticated session, served by the API's /me endpoint."
      title="Account"
    >
      <section className="grid max-w-md gap-2 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-lg">Session</h2>
        <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
          <dt className="text-slate-500">name</dt>
          <dd>{session.data.user.name ?? "—"}</dd>
          <dt className="text-slate-500">email</dt>
          <dd>{session.data.user.email}</dd>
          <dt className="text-slate-500">id</dt>
          <dd className="font-mono text-xs">{session.data.user.id}</dd>
        </dl>
      </section>

      <section className="mt-6 grid max-w-md gap-2 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-lg">GET /api/me (rewritten to API)</h2>
        {error ? <p className="text-rose-700 text-sm">{error}</p> : null}
        {me ? (
          <pre className="overflow-x-auto rounded bg-slate-50 p-3 text-slate-700 text-xs">
            {JSON.stringify(me, null, 2)}
          </pre>
        ) : (
          <p className="text-slate-500 text-sm">Loading…</p>
        )}
      </section>

      <button
        className="mt-6 rounded border border-rose-300 px-4 py-2 font-medium text-rose-700 text-sm"
        onClick={handleSignOut}
        type="button"
      >
        Sign out
      </button>
    </AppShell>
  );
}
