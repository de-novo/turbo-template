# @repo/auth

## Purpose

Auth contracts shared across every surface — session shape, user identity,
organization membership, role and permission constants. Pure Zod schemas
with no runtime side effects so they can ship to web, desktop, mobile, and
API equally.

## Public surface

Re-exports from `src/index.ts`:

- `sessionSchema`, `Session`
- `userIdentitySchema`, `UserIdentity`
- `organizationMembershipSchema`, `OrganizationMembership`
- `permissions` constant + `Permission` type
- `roles` constant + `Role` type
- `serviceAuthSchema` — token claims contract for service-to-service calls
  (Pattern C MSA topology).

## Allowed dependencies

- Imports: `@repo/contracts`, `zod`.
- Imported by: `@repo/auth-server` (runtime factory), `@repo/clients`,
  every app's session-aware code.

## Usage

```ts
import { sessionSchema, permissions } from "@repo/auth";

const session = sessionSchema.parse(payload);
if (!session.permissions.includes(permissions.licenseRead)) {
  throw new Error("forbidden");
}
```

## Tests

```bash
pnpm --filter @repo/auth test
```

Files: `src/session.test.ts`.

## Related

- `@repo/auth-server` — Better Auth runtime factory that produces values
  matching this contract.
- `docs/auth-topology.md` — full A/B/C topology decision matrix.
