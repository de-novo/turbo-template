# apps/mobile — Expo

## Purpose

Mobile shell on Expo 55 + React Native 0.85, navigation by Expo Router.
Shares the auth and contracts layer with the rest of the workspace.

## Stack

- Expo 55, React Native 0.85, Expo Router
- Metro bundler with `@expo/metro-config`
- React Native Web for the static web export build

## Dev

```bash
pnpm dev:mobile               # expo start (Metro UI)
pnpm --filter @repo/mobile dev:ios
pnpm --filter @repo/mobile dev:android
pnpm --filter @repo/mobile dev:web
```

When testing on a physical device, point `EXPO_PUBLIC_API_URL` at your
LAN IP (for example `http://192.168.1.10:4000`) so the device can reach
the API. `localhost` only works in the simulator.

## Build

```bash
pnpm --filter @repo/mobile build      # expo export --platform web → dist/
```

## Native builds (EAS)

`eas.json` defines four build profiles consumed by Expo Application
Services (`eas build`):

- **base** — shared baseline (Node 24.15.0).
- **development** — internal-distribution dev client. Use for
  hardware-device debugging with `expo-dev-client`.
- **preview** — internal-distribution staging build.
  iOS uses simulator output by default.
- **production** — store-bound. `autoIncrement: true` bumps
  build/version numbers automatically.

```bash
pnpm --filter @repo/mobile exec eas build --profile development --platform ios
pnpm --filter @repo/mobile exec eas build --profile production --platform all
```

The `submit.production` block declares the surface for `eas submit`
but ships every credential field as `null` — fill those in
**outside** version control:

- `submit.production.ios.appleId` / `ascAppId` / `appleTeamId`
- `submit.production.android.serviceAccountKeyPath` (mount the JSON
  via EAS Secrets, not the repo)

Run `eas login` once per machine and `eas project:init` to bind the
Expo project ID. The native build workflow itself is fork-specific
and not shipped — see
[docs/template-strategy.md](../../docs/template-strategy.md) "Avoid
day-one overreach".

## Env

Expo exposes only variables prefixed `EXPO_PUBLIC_*` to client code.
Defaults live in `env/local/mobile.env.example` and the loader at
`packages/env/src/apps/mobile.ts`. App identity (name / slug) is
derived from `@repo/config` in `app.config.ts`.

EAS profiles set `EXPO_PUBLIC_APP_ENV` to match the build target
(local / staging / production). Production builds inherit the
production loader's required fields.

## Allowed dependencies

`@repo/auth`, `@repo/config`, `@repo/contracts`, plus the
Expo / React Native ecosystem.

## Tests

```bash
pnpm --filter @repo/mobile test
```

Files: `src/config.test.ts` (verifies `@repo/config` is reachable through
the Metro resolver).

## Notes

- Mobile does not currently consume `@repo/design-system` (no React DOM).
  Native components use platform primitives directly.
