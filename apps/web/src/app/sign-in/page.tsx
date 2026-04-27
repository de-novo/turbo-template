"use client";

import { AppShell } from "@repo/design-system";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signIn } from "../../lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Sign-in failed.");
        return;
      }
      router.push("/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell description="Email + password sign-in via Better Auth." title="Sign in">
      <form
        className="grid max-w-sm gap-4 rounded-md border border-slate-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            autoComplete="email"
            className="rounded border border-slate-300 px-3 py-2"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Password</span>
          <input
            autoComplete="current-password"
            className="rounded border border-slate-300 px-3 py-2"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error ? (
          <p className="rounded bg-rose-50 p-2 text-rose-700 text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="rounded bg-slate-900 px-4 py-2 font-medium text-sm text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-slate-600 text-sm">
          New here?{" "}
          <a className="text-slate-900 underline" href="/sign-up">
            Create an account
          </a>
        </p>
      </form>
    </AppShell>
  );
}
