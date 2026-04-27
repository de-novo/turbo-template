#!/usr/bin/env node
// Cross-platform clean. Replaces a `rm -rf` + `find -exec` pipeline that
// only ran on POSIX shells; this version uses node:fs and works the same
// way on macOS, Linux, and Windows.
//
// Removes:
//   - root-level build/test artifacts (.turbo, coverage, playwright-report,
//     test-results)
//   - per-package build artifacts under apps/* and packages/* (dist,
//     .next, .turbo, coverage, .expo)
//   - all .tsbuildinfo files (TypeScript's incremental cache; if these
//     stick around without their dist outputs, tsc skips emit and turbo
//     reports "no output files for task")
//
// Does not touch node_modules — `pnpm install` would have to re-fetch
// every dependency, which is rarely what someone running `pnpm clean`
// wants. Use `rm -rf node_modules && pnpm install` explicitly when you
// need that.

import { readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ROOT_TARGETS = ["coverage", ".turbo", "playwright-report", "test-results"];
const PACKAGE_DIRS = ["dist", ".next", ".turbo", "coverage", ".expo"];
const TSBUILDINFO = "tsconfig.tsbuildinfo";

function rmIfExists(path) {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

function listChildDirs(parent) {
  try {
    return readdirSync(parent)
      .map((name) => join(parent, name))
      .filter((p) => {
        try {
          return statSync(p).isDirectory();
        } catch {
          return false;
        }
      });
  } catch (err) {
    if (err && err.code === "ENOENT") return [];
    throw err;
  }
}

let removed = 0;

for (const target of ROOT_TARGETS) {
  const path = join(repoRoot, target);
  rmIfExists(path);
  removed++;
}

for (const workspaceRoot of ["apps", "packages"]) {
  for (const pkgDir of listChildDirs(join(repoRoot, workspaceRoot))) {
    for (const target of PACKAGE_DIRS) {
      rmIfExists(join(pkgDir, target));
    }
    rmIfExists(join(pkgDir, TSBUILDINFO));
  }
}

process.stdout.write(`Cleaned ${removed} root targets and per-package build/test artifacts.\n`);
