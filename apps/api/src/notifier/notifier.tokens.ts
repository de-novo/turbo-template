/**
 * DI token for the active `Notifier`. Default is `noopNotifier`
 * (provided by `NotifierModule`); a fork swaps the provider value to
 * a real provider — see `docs/recipes/enable-notifier.md`.
 */
export const NOTIFIER = "NOTIFIER";
