"use client";

import { AppShell } from "@repo/design-system";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signUp } from "../../lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        setError(result.error.message ?? "Sign-up failed.");
        return;
      }
      router.push("/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell
      description="Create an account against the embedded Better Auth instance."
      title="Sign up"
    >
      <form
        className="grid max-w-sm gap-4 rounded-md border border-slate-200 bg-white p-6"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            autoComplete="name"
            className="rounded border border-slate-300 px-3 py-2"
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
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
            autoComplete="new-password"
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
          {pending ? "Creating account…" : "Create account"}
        </button>
        <p className="text-slate-600 text-sm">
          Already have an account?{" "}
          <a className="text-slate-900 underline" href="/sign-in">
            Sign in
          </a>
        </p>
      </form>
    </AppShell>
  );
}
