import { AppShell, EmptyState, StatusBadge } from "@repo/design-system";
import { Providers } from "./providers";

export default function HomePage() {
  return (
    <Providers>
      <AppShell
        description="A ready-to-extend baseline for Next.js, NestJS, shared contracts, auth, infrastructure, and design-system work."
        title="Fullstack TypeScript Template"
      >
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <StatusBadge tone="success">READY</StatusBadge>
            <h2 className="mt-4 font-semibold text-lg">Shared contracts</h2>
            <p className="mt-2 text-slate-600 text-sm">
              API envelopes, errors, pagination, IDs, env, and event contracts are centralized.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <StatusBadge>BASELINE</StatusBadge>
            <h2 className="mt-4 font-semibold text-lg">Design system</h2>
            <p className="mt-2 text-slate-600 text-sm">
              shadcn primitives stay separate from service-owned design-system components.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-5">
            <StatusBadge tone="warning">NEXT</StatusBadge>
            <h2 className="mt-4 font-semibold text-lg">Project rename</h2>
            <p className="mt-2 text-slate-600 text-sm">
              Use the rename script to switch display name and slug while keeping @repo imports.
            </p>
          </div>
        </section>
        <EmptyState
          description="Create domain modules after the first product boundary is clear."
          title="Template scaffold is ready"
        />
      </AppShell>
    </Providers>
  );
}
