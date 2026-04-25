import { type Session, sessionSchema } from "@repo/auth";
import type { AuthInstance } from "./auth.js";

type AuthApiSession = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;

/**
 * Convert Better Auth's getSession result into the shared @repo/auth Session
 * contract. Returns null when the request has no valid session.
 *
 * Organization memberships and permissions are left empty here — Phase 1 does
 * not ship an organization model. Downstream services can enrich the result.
 */
export function toContractSession(raw: AuthApiSession): Session | null {
	if (!raw || !raw.session || !raw.user) {
		return null;
	}

	return sessionSchema.parse({
		sessionId: raw.session.id,
		user: {
			userId: raw.user.id,
			email: raw.user.email,
			name: raw.user.name ?? undefined,
			memberships: [],
		},
		expiresAt: new Date(raw.session.expiresAt).toISOString(),
		permissions: [],
	});
}
