/**
 * DI token for the active `AuditSink`. Default is `noopAuditSink`
 * (provided by `AuditModule`); a fork swaps the provider value to a
 * real persistence story — DB-backed `audit_events` table, SIEM
 * forwarding, immutable WORM storage. See
 * `docs/recipes/enable-audit.md`.
 */
export const AUDIT_SINK = "AUDIT_SINK";
