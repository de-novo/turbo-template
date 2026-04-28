/**
 * DI token for the active `OutboxRelay`. Default is `noopOutboxRelay`
 * (provided by `OutboxModule`); a fork swaps the provider value to a
 * real relay — see `docs/recipes/enable-outbox-relay.md`.
 */
export const OUTBOX_RELAY = "OUTBOX_RELAY";
