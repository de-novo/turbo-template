# @repo/design-system

## Purpose

Service-owned visual layer: opinionated layout shells, status states, and
the design token export. Consumes `@repo/ui-primitives` for low-level
inputs and produces the components apps actually ship.

The agent-readable design brief lives at `DESIGN.md`. Run
`pnpm design:lint` (local-only) to validate it.

## Public surface

Re-exports from `src/index.ts`:

- `AppShell` — page chrome with title and description slot.
- `EmptyState`, `StatusBadge` — shared empty/loading/error patterns.
- `designTokens` — colors / radius / spacing as a typed const.

## Allowed dependencies

- Imports: `@repo/ui-primitives`, React (peer).
- Imported by: `apps/web`, `apps/desktop`. Mobile uses native primitives
  directly today.

## Usage

```tsx
import { AppShell, designTokens } from "@repo/design-system";

export default function Page() {
  return (
    <AppShell title="License" description="Manage your seats">
      <p style={{ color: designTokens.colors.textSecondary }}>...</p>
    </AppShell>
  );
}
```

## Tests

```bash
pnpm --filter @repo/design-system test
```

Files: `src/tokens.test.ts`.

## Related

- `DESIGN.md` — the design brief these components implement.
- `@repo/ui-primitives` — primitive substrate.
