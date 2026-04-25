export type DatabaseHealth = {
	status: "not-configured" | "ok" | "down";
	message: string;
};

export const databaseNotConfigured: DatabaseHealth = {
	status: "not-configured",
	message:
		"DATABASE_URL is not configured. Drizzle is ready, but no database is connected.",
};
