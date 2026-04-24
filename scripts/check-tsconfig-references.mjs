#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set([".git", ".next", ".turbo", "coverage", "dist", "node_modules"]);

function walkTsconfigs(root) {
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

      if (stats.isFile() && entry === "tsconfig.json") {
        files.push(path);
      }
    }
  }

  visit(root);
  return files;
}

const root = process.cwd();
const offenders = [];

for (const file of walkTsconfigs(root)) {
  const config = JSON.parse(readFileSync(file, "utf8"));

  if (Array.isArray(config.references) && config.references.length > 0) {
    offenders.push(relative(root, file));
  }
}

if (offenders.length > 0) {
  process.stderr.write(
    `Do not use TypeScript project references in this template. Declare workspace dependencies in package.json instead:\n${offenders
      .map((file) => `- ${file}`)
      .join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  "No tsconfig references found. Workspace dependencies are package.json-owned.\n",
);
