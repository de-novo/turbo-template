/**
 * Stand-alone token file to break the circular import between
 * `auth.module.ts` (registers the provider) and `guards/authenticated.guard.ts`
 * (consumes the token via `@Inject`). ESM circular imports can resolve
 * decorator arguments to `undefined` at class-construction time, which
 * surfaces as `Nest can't resolve dependencies of …` at runtime.
 */
export const AUTH_INSTANCE = "AUTH_INSTANCE";
