/**
 * DI token for the active `ObjectStorage`. Default is
 * `noopObjectStorage` (provided by `StorageModule`); a fork swaps
 * the provider value to a real provider — see
 * `docs/recipes/enable-object-storage.md`.
 */
export const OBJECT_STORAGE = "OBJECT_STORAGE";
