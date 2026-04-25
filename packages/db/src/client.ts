import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema/index.js";

export type DatabaseClientOptions = {
	connectionString: string;
	pool?: Omit<PoolConfig, "connectionString">;
};

export function createDatabaseClient(options: DatabaseClientOptions) {
	const pool = new Pool({
		connectionString: options.connectionString,
		...options.pool,
	});

	const db = drizzle(pool, { schema });

	return {
		db,
		pool,
		async close() {
			await pool.end();
		},
	};
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
