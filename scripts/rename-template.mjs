#!/usr/bin/env node

import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

export const DEFAULTS = {
	name: "Fullstack TypeScript Template",
	slug: "fullstack-typescript-template",
	scope: "@repo",
};

export const SKIP_DIRS = new Set([
	".git",
	".next",
	".omx",
	".turbo",
	".changeset",
	"coverage",
	"dist",
	"node_modules",
]);

export const SKIP_FILES = new Set([
	"project.config.json",
	"scripts/rename-template.mjs",
	"scripts/rename-template.test.mjs",
	"docs/template-strategy.md",
]);

export const TEXT_EXTENSIONS = new Set([
	".css",
	".env",
	".example",
	".html",
	".js",
	".json",
	".jsonc",
	".jsx",
	".md",
	".mjs",
	".mts",
	".ts",
	".tsx",
	".txt",
	".yaml",
	".yml",
]);

const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function toPascal(kebab) {
	return kebab
		.split("-")
		.map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
		.join("");
}

export function toCamel(kebab) {
	const pascal = toPascal(kebab);
	return pascal ? pascal[0].toLowerCase() + pascal.slice(1) : "";
}

export function toSnake(kebab) {
	return kebab.replaceAll("-", "_");
}

export function toConst(kebab) {
	return toSnake(kebab).toUpperCase();
}

/**
 * Build the ordered [from, to] tuple list for a slug rename.
 * Order is longest-first so longer variants are replaced before any prefix
 * variant (e.g. "FULLSTACK_TYPESCRIPT_TEMPLATE" before "fullstack-typescript-template").
 */
export function deriveSlugVariants(fromSlug, toSlug) {
	const tuples = [
		[toConst(fromSlug), toConst(toSlug)],
		[toPascal(fromSlug), toPascal(toSlug)],
		[toCamel(fromSlug), toCamel(toSlug)],
		[toSnake(fromSlug), toSnake(toSlug)],
		[fromSlug, toSlug],
	];
	return tuples.sort((a, b) => b[0].length - a[0].length);
}

export function applyReplacements(input, replacements) {
	let output = input;
	let count = 0;
	for (const [search, replacement] of replacements) {
		if (!search || search === replacement) continue;
		const before = output;
		output = output.split(search).join(replacement);
		if (output !== before) {
			count +=
				(before.length - output.length) /
				(search.length - replacement.length || 1);
		}
	}
	// Recompute count by raw-search (more accurate when lengths match)
	let raw = 0;
	for (const [search] of replacements) {
		if (!search) continue;
		let idx = input.indexOf(search);
		while (idx !== -1) {
			raw += 1;
			idx = input.indexOf(search, idx + search.length);
		}
	}
	return { output, count: raw || count };
}

/**
 * Re-walk the tree after replacement and report any leftover occurrence of
 * the default-name or default-slug variants. Returns an array of
 * { file, hits: [{ token, line }] }.
 */
export function verifyNoLeftovers(root, args) {
	const tokens = new Set();
	if (args.name && DEFAULTS.name !== args.name) tokens.add(DEFAULTS.name);
	if (args.slug && DEFAULTS.slug !== args.slug) {
		for (const [from] of deriveSlugVariants(DEFAULTS.slug, args.slug)) {
			if (from) tokens.add(from);
		}
	}
	if (args.scope && DEFAULTS.scope !== args.scope) tokens.add(DEFAULTS.scope);

	const findings = [];
	if (tokens.size === 0) return findings;

	for (const file of walkFiles(root)) {
		const content = readFileSync(file, "utf8");
		const hits = [];
		for (const token of tokens) {
			if (content.includes(token)) hits.push(token);
		}
		if (hits.length > 0)
			findings.push({ file: relative(root, file), tokens: hits });
	}
	return findings;
}

export function parseArgs(argv) {
	const args = {
		name: undefined,
		slug: undefined,
		scope: undefined,
		dryRun: false,
		verify: undefined,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = argv[index + 1];

		if (arg === "--name") {
			args.name = requireValue(arg, next);
			index += 1;
			continue;
		}

		if (arg === "--slug") {
			args.slug = requireValue(arg, next);
			index += 1;
			continue;
		}

		if (arg === "--scope") {
			args.scope = requireValue(arg, next);
			index += 1;
			continue;
		}

		if (arg === "--dry-run") {
			args.dryRun = true;
			continue;
		}

		if (arg === "--verify") {
			args.verify = true;
			continue;
		}

		if (arg === "--no-verify") {
			args.verify = false;
			continue;
		}

		if (arg === "--help" || arg === "-h") {
			printHelp();
			process.exit(0);
		}

		throw new Error(`Unknown argument: ${arg}`);
	}

	if (!args.name && !args.slug && !args.scope) {
		printHelp();
		throw new Error("Provide at least one of --name, --slug, or --scope.");
	}

	if (args.slug && !KEBAB_RE.test(args.slug)) {
		throw new Error(
			`Invalid --slug "${args.slug}". Use kebab-case lowercase, e.g. "acme-license".`,
		);
	}

	// Default: verify on real runs, off on dry-run, unless explicitly set.
	if (args.verify === undefined) args.verify = !args.dryRun;

	return args;
}

function requireValue(flag, value) {
	if (!value || value.startsWith("--")) {
		throw new Error(`${flag} requires a value.`);
	}
	return value;
}

function printHelp() {
	console.log(`Usage:
  node scripts/rename-template.mjs --name "Acme License" --slug "acme-license"
  node scripts/rename-template.mjs --name "Acme License" --slug "acme-license" --scope "@acme"
  node scripts/rename-template.mjs --name "Acme License" --dry-run
  node scripts/rename-template.mjs --slug "acme-license" --no-verify

Defaults replaced (slug variants are derived automatically):
  name:  ${DEFAULTS.name}
  slug:  ${DEFAULTS.slug}  (kebab, plus PascalCase, camelCase, snake_case, CONST_CASE)
  scope: ${DEFAULTS.scope}
`);
}

export function walkFiles(root) {
	const files = [];

	function visit(dir) {
		for (const entry of readdirSync(dir)) {
			if (SKIP_DIRS.has(entry)) {
				continue;
			}

			const path = join(dir, entry);
			const stats = statSync(path);

			if (stats.isDirectory()) {
				visit(path);
				continue;
			}

			if (
				stats.isFile() &&
				isTextFile(path) &&
				!SKIP_FILES.has(relative(root, path))
			) {
				files.push(path);
			}
		}
	}

	visit(root);
	return files;
}

function isTextFile(path) {
	const dotIndex = path.lastIndexOf(".");
	if (dotIndex === -1) {
		return false;
	}
	return TEXT_EXTENSIONS.has(path.slice(dotIndex));
}

export function buildReplacements(args) {
	const replacements = [];
	if (args.name) {
		replacements.push([DEFAULTS.name, args.name]);
	}
	if (args.slug) {
		for (const tuple of deriveSlugVariants(DEFAULTS.slug, args.slug)) {
			replacements.push(tuple);
		}
	}
	if (args.scope) {
		validateScope(args.scope);
		replacements.push([DEFAULTS.scope, args.scope]);
	}
	return replacements;
}

export function rewriteProjectConfig(root, args) {
	const configPath = join(root, "project.config.json");
	const config = existsSync(configPath)
		? JSON.parse(readFileSync(configPath, "utf8"))
		: {
				projectName: DEFAULTS.name,
				projectSlug: DEFAULTS.slug,
				packageScope: DEFAULTS.scope,
				projectTimezone: "Asia/Seoul",
			};

	const nextConfig = {
		...config,
		projectName: args.name ?? config.projectName,
		projectSlug: args.slug ?? config.projectSlug,
		packageScope: args.scope ?? config.packageScope,
	};

	return {
		path: configPath,
		before: `${JSON.stringify(config, null, 2)}\n`,
		after: `${JSON.stringify(nextConfig, null, 2)}\n`,
	};
}

export function runRename({
	root,
	args,
	log = console.log,
	errorLog = console.error,
}) {
	const replacements = buildReplacements(args);
	const changed = [];

	for (const file of walkFiles(root)) {
		const before = readFileSync(file, "utf8");
		const { output: after, count } = applyReplacements(before, replacements);
		if (after !== before) {
			changed.push({ file, before, after, count });
		}
	}

	const configChange = rewriteProjectConfig(root, args);
	if (
		configChange.after !== configChange.before ||
		!existsSync(configChange.path)
	) {
		changed.push({
			file: configChange.path,
			before: configChange.before,
			after: configChange.after,
			count: 1,
		});
	}

	if (args.dryRun) {
		for (const change of changed) {
			log(
				`${relative(root, change.file)}  (${change.count} replacement${change.count === 1 ? "" : "s"})`,
			);
		}
		log(`Dry run: ${changed.length} file(s) would change.`);
		return { changed, leftovers: [] };
	}

	for (const change of changed) {
		writeFileSync(change.file, change.after);
		log(
			`updated ${relative(root, change.file)}  (${change.count} replacement${change.count === 1 ? "" : "s"})`,
		);
	}
	log(`Done: ${changed.length} file(s) updated.`);

	let leftovers = [];
	if (args.verify) {
		leftovers = verifyNoLeftovers(root, args);
		if (leftovers.length > 0) {
			errorLog("\nVerify failed: default-form tokens still present in:");
			for (const finding of leftovers) {
				errorLog(`  ${finding.file}: [${finding.tokens.join(", ")}]`);
			}
			const err = new Error(
				`Verify failed: ${leftovers.length} file(s) still contain default-form tokens.`,
			);
			err.leftovers = leftovers;
			throw err;
		}
		log(`Verify ok: no leftover default-form tokens.`);
	}

	return { changed, leftovers };
}

export function validateScope(scope) {
	if (!/^@[a-z0-9][a-z0-9._-]*$/i.test(scope)) {
		throw new Error(
			`Invalid package scope: ${scope}. Use a single npm scope like "@acme".`,
		);
	}
}

function main() {
	const root = process.cwd();
	const args = parseArgs(process.argv.slice(2));
	runRename({ root, args });
}

// Only run when invoked directly via the CLI, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		main();
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
