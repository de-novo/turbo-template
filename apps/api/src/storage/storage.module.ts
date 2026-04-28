import { Module } from "@nestjs/common";
import { noopObjectStorage } from "@repo/infrastructure";
import { OBJECT_STORAGE } from "./storage.tokens.js";

/**
 * Provides the active `ObjectStorage` for opaque blob storage
 * (uploaded images, generated PDFs, exported CSVs, transcoded
 * media). Default is `noopObjectStorage` — `put` / `get` / `head` /
 * `signUrl` all reject; `delete` is silent. The lane is inert until
 * a fork swaps the provider (recipe at
 * `docs/recipes/enable-object-storage.md`).
 *
 * The contract is buffered (`Uint8Array` body); real adapters extend
 * with their own stream methods for multi-GB uploads. See ADR 0009.
 */
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      useValue: noopObjectStorage,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
