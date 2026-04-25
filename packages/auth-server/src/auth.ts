import { sso } from "@better-auth/sso";
import { schema } from "@repo/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export type AuthDatabase = NodePgDatabase<typeof schema>;

export type SocialProviderCredentials = {
	clientId: string;
	clientSecret: string;
};

export type GenericOAuthProviderConfig = {
	providerId: string;
	clientId: string;
	clientSecret: string;
	discoveryUrl?: string;
	authorizationUrl?: string;
	tokenUrl?: string;
	userInfoUrl?: string;
	scopes?: string[];
	redirectURI?: string;
};

export type SSOOptions = {
	/**
	 * When true, disable the @better-auth/sso plugin entirely. Defaults to false
	 * (plugin active). Set this to `true` to trim SAML-related deps from the
	 * bundle for projects that will never use enterprise SSO.
	 */
	disabled?: boolean;
	/** Enable `/auth/sso/verify-domain` and mark providers with a verified flag. */
	enableDomainVerification?: boolean;
};

export type CreateAuthOptions = {
	db: AuthDatabase;
	baseURL: string;
	secret: string;
	trustedOrigins: string[];
	socialProviders?: {
		google?: SocialProviderCredentials;
		github?: SocialProviderCredentials;
	};
	genericOAuthConfigs?: GenericOAuthProviderConfig[];
	sso?: SSOOptions;
};

export type AuthInstance = ReturnType<typeof createAuth>;

export function createAuth(options: CreateAuthOptions) {
	const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};
	if (options.socialProviders?.google) {
		socialProviders.google = options.socialProviders.google;
	}
	if (options.socialProviders?.github) {
		socialProviders.github = options.socialProviders.github;
	}

	const hasGenericOAuth =
		options.genericOAuthConfigs !== undefined &&
		options.genericOAuthConfigs.length > 0;
	const ssoEnabled = options.sso?.disabled !== true;
	const ssoDomainVerification = options.sso?.enableDomainVerification === true;

	return betterAuth({
		baseURL: options.baseURL,
		secret: options.secret,
		trustedOrigins: options.trustedOrigins,
		database: drizzleAdapter(options.db, {
			provider: "pg",
			schema: {
				user: schema.user,
				session: schema.session,
				account: schema.account,
				verification: schema.verification,
				ssoProvider: schema.ssoProvider,
			},
		}),
		emailAndPassword: {
			enabled: true,
		},
		socialProviders,
		plugins: [
			...(hasGenericOAuth
				? [
						genericOAuth({
							config:
								options.genericOAuthConfigs as GenericOAuthProviderConfig[],
						}),
					]
				: []),
			...(ssoEnabled
				? [
						sso(
							ssoDomainVerification
								? { domainVerification: { enabled: true } }
								: {},
						),
					]
				: []),
		],
	});
}
