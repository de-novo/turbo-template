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

Native binaries are produced via EAS (`eas build`) once the project sets
that up; not configured in the template.

## Env

Expo exposes only variables prefixed `EXPO_PUBLIC_*` to client code.
Defaults are documented in the root `.env.example`. App identity (name /
slug) is derived from `@repo/config` in `app.config.ts`.

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
