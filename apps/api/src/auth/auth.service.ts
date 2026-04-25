import { Inject, Injectable } from "@nestjs/common";
import { type AuthInstance, createAuth } from "@repo/auth-server";
import type { DatabaseClient } from "@repo/db";
import { type ApiEnv, pickSocialProviders } from "@repo/env/apps/api";
import { API_ENV, DATABASE_CLIENT } from "../db/db.tokens.js";

@Injectable()
export class AuthService {
	readonly auth: AuthInstance;

	constructor(
		@Inject(API_ENV) env: ApiEnv,
		@Inject(DATABASE_CLIENT) dbClient: DatabaseClient,
	) {
		if (!env.BETTER_AUTH_URL || !env.BETTER_AUTH_SECRET) {
			throw new Error(
				"BETTER_AUTH_URL and BETTER_AUTH_SECRET must be set when AUTH_MODE is better-auth-embedded.",
			);
		}
		this.auth = createAuth({
			db: dbClient.db,
			baseURL: env.BETTER_AUTH_URL,
			secret: env.BETTER_AUTH_SECRET,
			trustedOrigins: [env.WEB_ORIGIN],
			socialProviders: pickSocialProviders(env),
		});
	}
}
