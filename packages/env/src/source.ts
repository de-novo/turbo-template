export type EnvSource = Record<string, unknown>;

export type StrictEnvOptions = {
	strictForeignKeys?: boolean;
};

export function pickEnv(source: EnvSource, keys: readonly string[]): EnvSource {
	const picked: EnvSource = {};

	for (const key of keys) {
		const value = source[key];
		if (value !== undefined) {
			picked[key] = value;
		}
	}

	return picked;
}

export function assertNoForeignKeys(
	appName: string,
	source: EnvSource,
	forbiddenKeys: readonly string[],
	forbiddenPrefixes: readonly string[],
	options: StrictEnvOptions = {},
) {
	if (options.strictForeignKeys === false) {
		return;
	}

	const offenders = Object.keys(source)
		.filter((key) => source[key] !== undefined)
		.filter(
			(key) =>
				forbiddenKeys.includes(key) ||
				forbiddenPrefixes.some((prefix) => key.startsWith(prefix)),
		)
		.sort();

	if (offenders.length > 0) {
		throw new Error(
			`${appName} env received foreign or secret key(s): ${offenders.join(
				", ",
			)}. Split env by app and import only @repo/env/apps/${appName}.`,
		);
	}
}
