import type { RefinementCtx } from "zod";

export function requireInProduction(
	ctx: RefinementCtx,
	appEnv: string,
	values: Record<string, unknown>,
	keys: readonly string[],
) {
	if (appEnv !== "production") {
		return;
	}

	for (const key of keys) {
		const value = values[key];
		if (value === undefined || value === "") {
			ctx.addIssue({
				code: "custom",
				message: `${key} is required when APP_ENV is production.`,
				path: [key],
			});
		}
	}
}
