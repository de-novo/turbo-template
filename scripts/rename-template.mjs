#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const DEFAULTS = {
  name: "Fullstack TypeScript Template",
  slug: "fullstack-typescript-template",
  scope: "@repo",
};

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".omx",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);

const SKIP_FILES = new Set([
  "project.config.json",
  "scripts/rename-template.mjs",
  "docs/template-strategy.md",
]);

const TEXT_EXTENSIONS = new Set([
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

function parseArgs(argv) {
  const args = {
    name: undefined,
    slug: undefined,
    scope: undefined,
    dryRun: false,
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

Defaults replaced:
  name:  ${DEFAULTS.name}
  slug:  ${DEFAULTS.slug}
  scope: ${DEFAULTS.scope}
`);
}

function walkFiles(root) {
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

      if (stats.isFile() && isTextFile(path) && !SKIP_FILES.has(relative(root, path))) {
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

function replaceAll(input, search, replacement) {
  return input.split(search).join(replacement);
}

function rewriteProjectConfig(root, args) {
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

function main() {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const replacements = [];

  if (args.name) {
    replacements.push([DEFAULTS.name, args.name]);
  }

  if (args.slug) {
    replacements.push([DEFAULTS.slug, args.slug]);
  }

  if (args.scope) {
    validateScope(args.scope);
    replacements.push([DEFAULTS.scope, args.scope]);
  }

  const changed = [];

  for (const file of walkFiles(root)) {
    const before = readFileSync(file, "utf8");
    let after = before;

    for (const [search, replacement] of replacements) {
      after = replaceAll(after, search, replacement);
    }

    if (after !== before) {
      changed.push({ file, before, after });
    }
  }

  const configChange = rewriteProjectConfig(root, args);
  if (configChange.after !== configChange.before || !existsSync(configChange.path)) {
    changed.push({
      file: configChange.path,
      before: configChange.before,
      after: configChange.after,
    });
  }

  if (args.dryRun) {
    for (const change of changed) {
      console.log(relative(root, change.file));
    }
    console.log(`Dry run: ${changed.length} file(s) would change.`);
    return;
  }

  for (const change of changed) {
    writeFileSync(change.file, change.after);
    console.log(`updated ${relative(root, change.file)}`);
  }

  console.log(`Done: ${changed.length} file(s) updated.`);
}

function validateScope(scope) {
  if (!/^@[a-z0-9][a-z0-9._-]*$/i.test(scope)) {
    throw new Error(`Invalid package scope: ${scope}. Use a single npm scope like "@acme".`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
