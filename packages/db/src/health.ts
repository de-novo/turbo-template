import { sql } from "drizzle-orm";
import type { DatabaseClient } from "./client.js";

export type DatabaseHealth = {
  status: "not-configured" | "ok" | "down";
  message: string;
};

export const databaseNotConfigured: DatabaseHealth = {
  status: "not-configured",
  message: "DATABASE_URL is not configured. Drizzle is ready, but no database is connected.",
};

/**
 * Liveness probe against a connected client. Issues `SELECT 1` and reports
 * `ok` / `down` based on the result. Callers that have not configured a
 * client should report `databaseNotConfigured` directly without calling this.
 */
export async function checkDatabase(client: DatabaseClient): Promise<DatabaseHealth> {
  try {
    await client.db.execute(sql`SELECT 1`);
    return { status: "ok", message: "Database reachable." };
  } catch (error) {
    return {
      status: "down",
      message: error instanceof Error ? error.message : "Unknown database failure.",
    };
  }
}
