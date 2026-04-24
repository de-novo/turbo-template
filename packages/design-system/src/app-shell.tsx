import type { PropsWithChildren } from "react";

export type AppShellProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function AppShell({ children, description, title }: AppShellProps) {
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="border-slate-200 border-b pb-5">
          <h1 className="font-semibold text-3xl tracking-normal">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-slate-600">{description}</p> : null}
        </header>
        {children}
      </div>
    </main>
  );
}
