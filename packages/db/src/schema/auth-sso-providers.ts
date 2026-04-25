import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-users.js";

/**
 * Managed by @better-auth/sso. Column names follow Better Auth's default field
 * naming (camelCase kept in DB for compatibility with the Drizzle adapter's
 * field ↔ column mapping). Per-organization SSO uses `organizationId` — it is
 * kept as plain text here because Organization tables are not modelled yet; a
 * future phase should add the FK constraint in a separate migration.
 */
export const ssoProvider = pgTable(
	"sso_provider",
	{
		id: text("id").primaryKey(),
		issuer: text("issuer").notNull(),
		oidcConfig: text("oidc_config"),
		samlConfig: text("saml_config"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		providerId: text("provider_id").notNull(),
		organizationId: text("organization_id"),
		domain: text("domain").notNull(),
		domainVerified: boolean("domain_verified").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("sso_provider_provider_id_unique").on(table.providerId),
		index("sso_provider_domain_idx").on(table.domain),
		index("sso_provider_organization_id_idx").on(table.organizationId),
	],
);

export type SsoProvider = typeof ssoProvider.$inferSelect;
export type NewSsoProvider = typeof ssoProvider.$inferInsert;
