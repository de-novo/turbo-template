# Add an env key

Each app has its own loader at `packages/env/src/apps/<app>.ts` and a paired example at
`env/local/<app>.env.example` (and `env/production/<app>.env.example`). The loader is the source of
truth: it rejects unknown keys, requires production-only values via `requireInProduction`, and
strips out cross-app prefixes (`NEXT_PUBLIC_*` shouldn't reach the API loader, etc.).

This recipe walks through adding a hypothetical `STRIPE_WEBHOOK_SECRET` to the API.

## 1. Add the key to the API's allowlist

`packages/env/src/apps/api.ts`:

```ts
const apiEnvKeys = [
  // … existing keys …
  "STRIPE_WEBHOOK_SECRET",
] as const;
```

> **Why:** `pickEnv` only reads keys in this allowlist. Forgetting this step makes the value
> silently `undefined` even when the env var is set.

## 2. Add the schema entry

In the same file, inside the `apiEnvSchema.extend({ ... })`:

```ts
STRIPE_WEBHOOK_SECRET: z.string().min(20).optional(),
```

If the value is required in production, add a `requireInProduction` line in the trailing
`.superRefine`:

```ts
.superRefine((value, ctx) => {
  // … existing refinements …
  requireInProduction(ctx, value.APP_ENV, value, ["STRIPE_WEBHOOK_SECRET"]);
})
```

> **Why a superRefine instead of `.min().nonempty()`?** Local dev shouldn't fail when the key is
> absent — only `APP_ENV=production` enforces it. `requireInProduction` does that branching.

## 3. Update the example files

`env/local/api.env.example` (commented out — local dev usually doesn't need it):

```
# STRIPE_WEBHOOK_SECRET=whsec_local_test_key
```

`env/production/api.env.example` (uncommented placeholder so production ops know to fill it in):

```
STRIPE_WEBHOOK_SECRET=replace-with-the-stripe-dashboard-value
```

## 4. Validate the examples

```bash
pnpm env:check
```

This runs `packages/env/src/check-examples.ts` against every example through its app loader. A
failure here means the example is invalid against the schema — fix the example, not the loader.

## 5. Consume the value

Anywhere that calls `loadApiEnv()` already gets the new key on the returned object:

```ts
const env = loadApiEnv();
if (env.STRIPE_WEBHOOK_SECRET) {
  // wire the webhook
}
```

For Nest DI consumers, the value flows through `ApiEnvModule`'s `API_ENV` provider — inject with
`@Inject(API_ENV)` and read `this.env.STRIPE_WEBHOOK_SECRET`.

## 6. (If exposed to web/desktop/mobile) mirror to the public loader

Public-facing values must use the per-stack prefix and live in the matching loader:

| Surface  | Prefix         | Loader                              |
| -------- | -------------- | ----------------------------------- |
| Web      | `NEXT_PUBLIC_` | `packages/env/src/apps/web.ts`      |
| Desktop  | `VITE_`        | `packages/env/src/apps/desktop.ts`  |
| Mobile   | `EXPO_PUBLIC_` | `packages/env/src/apps/mobile.ts`   |
| MFE host | `VITE_`        | `packages/env/src/apps/mfe-host.ts` |

Never re-export a server secret through a public loader — the foreign-key guard in
`assertNoForeignKeys` is a defense, but the design rule is: secrets stay server-side.

## 7. Verify

```bash
pnpm env:check
pnpm --filter @repo/env typecheck
pnpm --filter @repo/env test
```

CI runs the same on PR.
