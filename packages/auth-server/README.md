# @repo/auth-server

## Purpose

Better Auth runtime factory. Encapsulates Better Auth wiring (DB adapter,
SSO providers, email/password) so any app can mount auth as either an HTTP
route handler (Pattern A in `apps/web`, Pattern B in `apps/api`, default)
or a standalone service (Pattern C, `apps/auth-service`). Keeps the host
app free of Better Auth specifics.

## Public surface

Re-exports from `src/index.ts`:

- `createAuth(db, options) -> AuthInstance` — builds a configured Better
  Auth instance.
- `AuthInstance`, `CreateAuthOptions`, `GenericOAuthProviderConfig` types.
- `toContractSession(rawApiSession) -> Session | null` — converts Better
  Auth's `getSession` result into the shared `@repo/auth` session contract.

## Allowed dependencies

- Imports: `@repo/auth`, `@repo/contracts`, `@repo/db`, `better-auth`,
  `@better-auth/sso`, `drizzle-orm`, `zod`.
- Imported by: whichever app mounts auth — `apps/api` by default, see
  recipes in `docs/auth-recipes/` for moving the mount point.

## Usage

```ts
import { createAuth } from "@repo/auth-server";

const auth = createAuth(db, {
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.WEB_ORIGIN],
  socialProviders: pickSocialProviders(env),
});
```

## Tests

```bash
pnpm --filter @repo/auth-server test
```

Files: `src/session.test.ts` (covers `toContractSession`).

## Related

- `docs/auth-recipes/pattern-a-web-mount.md`
- `docs/auth-recipes/pattern-c-msa.md`
- `docs/auth-recipes/sso-provider-registration.md`
