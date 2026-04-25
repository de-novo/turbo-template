# @repo/ui-primitives

## Purpose

shadcn/ui primitive substrate plus the canonical `cn()` class merger.
Contains low-level inputs that are styled but not yet opinionated about
layout. The opinionated layer lives in `@repo/design-system`.

## Public surface

Re-exports from `src/index.ts`:

- `Button`, `buttonVariants`, `ButtonProps` — primary/secondary/ghost
  variants + sm/md/lg sizes via `class-variance-authority`.
- `cn(...inputs)` — `clsx` + `tailwind-merge` wrapper, deduplicates and
  resolves conflicting Tailwind utilities.

## Allowed dependencies

- Imports: `class-variance-authority`, `clsx`, `tailwind-merge`,
  React (peer).
- Imported by: `@repo/design-system`, `apps/web`. Other apps may import
  directly when they don't need the design-system layer.

## Adding new primitives

Generate primitives with the shadcn CLI in their respective project
contexts and place lightweight wrappers here. Keep them framework-only —
no business logic, no data fetching.

## Usage

```tsx
import { Button, cn } from "@repo/ui-primitives";

export function SaveBar({ saving }: { saving: boolean }) {
  return (
    <div className={cn("flex gap-2", saving && "opacity-60")}>
      <Button variant="primary" disabled={saving}>Save</Button>
      <Button variant="ghost">Cancel</Button>
    </div>
  );
}
```

## Tests

```bash
pnpm --filter @repo/ui-primitives test
```

Files: `src/utils.test.ts` (covers `cn`).
