/**
 * Idempotent seed script. Run via `pnpm db:seed` from the root, which proxies to
 * this file with `tsx`. Requires DATABASE_URL to be set.
 *
 * Forks should add their own seed entries here (sample organizations, demo users,
 * fixture data for an internal product). Keep every insert ON CONFLICT DO
 * NOTHING (or equivalent) so re-running the seed is safe.
 */

import { sql } from "drizzle-orm";
import { createDatabaseClient } from "./client.js";
import { systemEvents } from "./schema/index.js";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  process.stderr.write("DATABASE_URL is not set. Cannot seed.\n");
  process.exit(1);
}

const client = createDatabaseClient({ connectionString: databaseUrl });

try {
  await client.db
    .insert(systemEvents)
    .values({
      eventName: "template.seeded",
      eventVersion: "1",
      payload: {
        seededAt: new Date().toISOString(),
        seededBy: "packages/db/src/seed.ts",
      },
    })
    .onConflictDoNothing();

  const rows = await client.db.execute(sql`SELECT count(*) AS total FROM system_events`);
  process.stdout.write(`Seed complete. system_events rows: ${rows.rows[0]?.["total"] ?? "?"}\n`);
} finally {
  await client.close();
}
