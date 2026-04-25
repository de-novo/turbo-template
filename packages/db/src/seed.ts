import { eq } from "drizzle-orm";
import { createDatabaseClient } from "./client.js";
import { note, user } from "./schema/index.js";

/**
 * Idempotent seed for local development. Inserts one demo user and two
 * notes if they don't already exist. Safe to run repeatedly.
 *
 * Auth-related rows (sessions, accounts, sso providers) are intentionally
 * NOT seeded — Better Auth populates them on first sign-in.
 */
const DEMO_USER_ID = "seed-demo-user";
const DEMO_USER_EMAIL = "demo@example.test";

const DEMO_NOTES = [
	{
		id: "seed-note-1",
		title: "Welcome",
		content:
			"This is a seed note. Run `pnpm --filter @repo/db db:seed` to (re)create the demo data.",
	},
	{
		id: "seed-note-2",
		title: "Where to look next",
		content:
			"apps/api/src/notes is the canonical reference module. Copy it to add new entities.",
	},
] as const;

export async function seed(connectionString: string): Promise<void> {
	const client = createDatabaseClient({ connectionString });
	try {
		const existing = await client.db
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, DEMO_USER_EMAIL))
			.limit(1);

		if (existing.length === 0) {
			await client.db.insert(user).values({
				id: DEMO_USER_ID,
				email: DEMO_USER_EMAIL,
				name: "Demo User",
				emailVerified: true,
			});
		}

		// onConflictDoNothing on the primary key keeps repeat runs cheap.
		for (const row of DEMO_NOTES) {
			await client.db
				.insert(note)
				.values({ ...row, ownerId: existing[0]?.id ?? DEMO_USER_ID })
				.onConflictDoNothing({ target: note.id });
		}
	} finally {
		await client.close();
	}
}

async function main() {
	const connectionString = process.env["DATABASE_URL"];
	if (!connectionString) {
		process.stderr.write(
			"DATABASE_URL is not set. Start postgres (docker compose up -d postgres) and set DATABASE_URL.\n",
		);
		process.exit(1);
	}
	await seed(connectionString);
	process.stdout.write(
		`Seed complete: 1 demo user (${DEMO_USER_EMAIL}) + ${DEMO_NOTES.length} notes.\n`,
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		process.stderr.write(
			`Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
		);
		process.exit(1);
	});
}
