import {
	Global,
	Inject,
	Module,
	type OnApplicationShutdown,
} from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@repo/db";
import { type ApiEnv, loadApiEnv } from "@repo/env/apps/api";
import { API_ENV, DATABASE_CLIENT } from "./db.tokens.js";

@Global()
@Module({
	providers: [
		{
			provide: API_ENV,
			useFactory: () => loadApiEnv(),
		},
		{
			provide: DATABASE_CLIENT,
			inject: [API_ENV],
			useFactory: (env: ApiEnv): DatabaseClient => {
				if (!env.DATABASE_URL) {
					throw new Error("DATABASE_URL is required for the database client.");
				}
				return createDatabaseClient({ connectionString: env.DATABASE_URL });
			},
		},
	],
	exports: [API_ENV, DATABASE_CLIENT],
})
export class DbModule implements OnApplicationShutdown {
	constructor(
		@Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient,
	) {}

	async onApplicationShutdown() {
		await this.dbClient.close();
	}
}
