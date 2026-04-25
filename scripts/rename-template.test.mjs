import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	statSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	buildReplacements,
	DEFAULTS,
	deriveSlugVariants,
	parseArgs,
	runRename,
	toCamel,
	toConst,
	toPascal,
	toSnake,
	verifyNoLeftovers,
} from "./rename-template.mjs";

let root;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "rename-template-"));
});

afterEach(() => {
	// Tmpdirs are leaked rather than rm-rfed: harmless for tests, the OS
	// reclaims them. Each test gets a fresh dir via beforeEach.
});

function write(rel, content) {
	const full = join(root, rel);
	mkdirSync(join(full, ".."), { recursive: true });
	writeFileSync(full, content);
	return full;
}

function read(rel) {
	return readFileSync(join(root, rel), "utf8");
}

function defaultProjectConfig() {
	return `${JSON.stringify(
		{
			projectName: DEFAULTS.name,
			projectSlug: DEFAULTS.slug,
			packageScope: DEFAULTS.scope,
			projectTimezone: "Asia/Seoul",
		},
		null,
		2,
	)}\n`;
}

function silent() {
	const messages = [];
	const errors = [];
	return {
		log: (msg) => messages.push(msg),
		errorLog: (msg) => errors.push(msg),
		messages,
		errors,
	};
}

describe("case derivation helpers", () => {
	it("toPascal", () => {
		expect(toPascal("fullstack-typescript-template")).toBe(
			"FullstackTypescriptTemplate",
		);
		expect(toPascal("acme")).toBe("Acme");
		expect(toPascal("")).toBe("");
	});
	it("toCamel", () => {
		expect(toCamel("fullstack-typescript-template")).toBe(
			"fullstackTypescriptTemplate",
		);
	});
	it("toSnake", () => {
		expect(toSnake("fullstack-typescript-template")).toBe(
			"fullstack_typescript_template",
		);
	});
	it("toConst", () => {
		expect(toConst("fullstack-typescript-template")).toBe(
			"FULLSTACK_TYPESCRIPT_TEMPLATE",
		);
	});
});

describe("deriveSlugVariants", () => {
	it("emits all five forms ordered longest-first", () => {
		const variants = deriveSlugVariants(
			"fullstack-typescript-template",
			"acme-license",
		);
		expect(variants[0]).toEqual([
			"FULLSTACK_TYPESCRIPT_TEMPLATE",
			"ACME_LICENSE",
		]);
		expect(variants).toContainEqual([
			"fullstack-typescript-template",
			"acme-license",
		]);
		expect(variants).toContainEqual([
			"fullstackTypescriptTemplate",
			"acmeLicense",
		]);
		expect(variants).toContainEqual([
			"fullstack_typescript_template",
			"acme_license",
		]);
		expect(variants).toContainEqual([
			"FullstackTypescriptTemplate",
			"AcmeLicense",
		]);
		// Longest-first: first entry is at least as long as any other.
		for (const tuple of variants.slice(1)) {
			expect(variants[0][0].length).toBeGreaterThanOrEqual(tuple[0].length);
		}
	});
});

describe("parseArgs", () => {
	it("rejects an invalid kebab slug", () => {
		expect(() => parseArgs(["--slug", "AcmeLicense"])).toThrow(/kebab-case/);
		expect(() => parseArgs(["--slug", "acme_license"])).toThrow(/kebab-case/);
		expect(() => parseArgs(["--slug", "1bad"])).toThrow(/kebab-case/);
	});
	it("accepts a valid kebab slug", () => {
		const args = parseArgs(["--slug", "acme-license"]);
		expect(args.slug).toBe("acme-license");
	});
	it("requires at least one of name/slug/scope", () => {
		expect(() => parseArgs([])).toThrow(/at least one/i);
	});
	it("defaults verify on, off when --dry-run", () => {
		expect(parseArgs(["--slug", "x"]).verify).toBe(true);
		expect(parseArgs(["--slug", "x", "--dry-run"]).verify).toBe(false);
		expect(parseArgs(["--slug", "x", "--dry-run", "--verify"]).verify).toBe(
			true,
		);
		expect(parseArgs(["--slug", "x", "--no-verify"]).verify).toBe(false);
	});
});

describe("buildReplacements", () => {
	it("includes all five slug variants and orders them longest-first", () => {
		const reps = buildReplacements({ slug: "acme-license" });
		const fromsSorted = reps.map((t) => t[0]);
		const sortedDescending = [...fromsSorted].sort(
			(a, b) => b.length - a.length,
		);
		expect(fromsSorted).toEqual(sortedDescending);
		expect(reps.length).toBe(5);
	});
	it("includes name when provided", () => {
		const reps = buildReplacements({ name: "Acme License" });
		expect(reps).toContainEqual([DEFAULTS.name, "Acme License"]);
	});
});

describe("runRename — replacement coverage", () => {
	it("replaces every slug variant in source files", () => {
		write("project.config.json", defaultProjectConfig());
		write(
			"src/app.ts",
			`// id: fullstack-typescript-template
const projectId = "fullstack_typescript_template";
const Pascal = "FullstackTypescriptTemplate";
const camel = "fullstackTypescriptTemplate";
const ENV = "FULLSTACK_TYPESCRIPT_TEMPLATE";
`,
		);
		write(
			"README.md",
			`# Fullstack TypeScript Template\n\nslug fullstack-typescript-template\n`,
		);

		const sink = silent();
		runRename({
			root,
			args: {
				name: "Acme License",
				slug: "acme-license",
				dryRun: false,
				verify: true,
			},
			log: sink.log,
			errorLog: sink.errorLog,
		});

		const ts = read("src/app.ts");
		expect(ts).toContain("acme-license");
		expect(ts).toContain("acme_license");
		expect(ts).toContain("AcmeLicense");
		expect(ts).toContain("acmeLicense");
		expect(ts).toContain("ACME_LICENSE");
		expect(ts).not.toContain("fullstack");
		expect(ts).not.toContain("Fullstack");
		expect(ts).not.toContain("FULLSTACK");

		const md = read("README.md");
		expect(md).toContain("Acme License");
		expect(md).toContain("acme-license");
		expect(md).not.toContain("Fullstack");

		const cfg = JSON.parse(read("project.config.json"));
		expect(cfg.projectName).toBe("Acme License");
		expect(cfg.projectSlug).toBe("acme-license");
	});

	it("does not over-substitute when default and target share a prefix", () => {
		write("project.config.json", defaultProjectConfig());
		write("src/x.ts", `const id = "FullstackTypescriptTemplateService";`);
		runRename({
			root,
			args: { slug: "acme-license", dryRun: false, verify: true },
			...silent(),
		});
		expect(read("src/x.ts")).toBe(`const id = "AcmeLicenseService";`);
	});
});

describe("runRename — SKIP_DIRS and SKIP_FILES", () => {
	it("does not touch files inside SKIP_DIRS", () => {
		write("project.config.json", defaultProjectConfig());
		write("node_modules/pkg/readme.md", "# Fullstack TypeScript Template");
		write(".git/config", "Fullstack TypeScript Template");
		runRename({
			root,
			args: { name: "Acme License", dryRun: false, verify: true },
			...silent(),
		});
		expect(read("node_modules/pkg/readme.md")).toBe(
			"# Fullstack TypeScript Template",
		);
		expect(read(".git/config")).toBe("Fullstack TypeScript Template");
	});
	it("does not touch SKIP_FILES other than project.config.json", () => {
		write("project.config.json", defaultProjectConfig());
		const stratPath = "docs/template-strategy.md";
		write(stratPath, "# strategy: fullstack-typescript-template\n");
		runRename({
			root,
			args: { slug: "acme-license", dryRun: false, verify: false },
			...silent(),
		});
		expect(read(stratPath)).toContain("fullstack-typescript-template");
	});
});

describe("runRename — verify", () => {
	it("verify passes when no leftovers remain", () => {
		write("project.config.json", defaultProjectConfig());
		write("src/a.ts", "// fullstack-typescript-template\n");
		expect(() =>
			runRename({
				root,
				args: { slug: "acme-license", dryRun: false, verify: true },
				...silent(),
			}),
		).not.toThrow();
	});

	it("verify throws when a planted leftover persists", () => {
		write("project.config.json", defaultProjectConfig());
		// Leftover lives inside a SKIP_DIR file plus a regular file mid-rename:
		// simulate by post-editing a file outside the rename pass.
		const before = "// id: fullstack-typescript-template";
		write("src/keep.ts", before);
		runRename({
			root,
			args: { slug: "acme-license", dryRun: false, verify: false },
			...silent(),
		});
		// Re-introduce a leftover, then run verifyNoLeftovers directly.
		writeFileSync(
			join(root, "src/keep.ts"),
			`${read("src/keep.ts")}\n// stray fullstack-typescript-template`,
		);
		const findings = verifyNoLeftovers(root, { slug: "acme-license" });
		expect(findings.length).toBeGreaterThan(0);
		expect(findings[0].file).toBe("src/keep.ts");
	});
});

describe("runRename — dry run", () => {
	it("reports replacements per file and writes nothing", () => {
		write("project.config.json", defaultProjectConfig());
		const tsPath = "src/a.ts";
		const initialContent = `const id = "fullstack-typescript-template";\nconst pascal = "FullstackTypescriptTemplate";\n`;
		const written = write(tsPath, initialContent);
		const initialMtime = statSync(written).mtimeMs;

		// Force the timestamp 2s into the past so we can reliably detect any
		// future write.
		const past = new Date(initialMtime - 2000);
		utimesSync(written, past, past);
		const settledMtime = statSync(written).mtimeMs;

		const sink = silent();
		const result = runRename({
			root,
			args: { slug: "acme-license", dryRun: true, verify: false },
			log: sink.log,
			errorLog: sink.errorLog,
		});

		expect(result.changed.some((c) => c.file.endsWith("a.ts"))).toBe(true);
		expect(sink.messages.some((m) => /a\.ts.*replacement/.test(m))).toBe(true);

		expect(read(tsPath)).toBe(initialContent);
		expect(statSync(written).mtimeMs).toBe(settledMtime);
	});
});
