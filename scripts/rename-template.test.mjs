// Smoke tests for scripts/rename-template.mjs.
// Run via `pnpm test:scripts` (which invokes `node --test`).
//
// We exercise the script via spawn rather than importing it, because the script
// reads / writes the working tree on the spot. Each test runs against a temporary
// fixture so the real repo never changes.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = resolve(import.meta.dirname, "..");
const renameScript = resolve(repoRoot, "scripts/rename-template.mjs");

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "rename-template-"));
  // Minimal fixture: a project.config.json + a README that contains the
  // default name/slug/scope tokens.
  writeFileSync(
    join(dir, "project.config.json"),
    JSON.stringify(
      {
        projectName: "Fullstack TypeScript Template",
        projectSlug: "fullstack-typescript-template",
        packageScope: "@repo",
        projectTimezone: "Asia/Seoul",
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    join(dir, "README.md"),
    "# Fullstack TypeScript Template\n\nUses `@repo/contracts` and slug `fullstack-typescript-template`.\n",
  );
  mkdirSync(join(dir, "scripts"));
  // The script skips itself; we don't actually need to copy the real one.
  // But the script reads its own relative path via cwd, so it walks the
  // fixture not the real repo. Good enough for behavior tests.
  return dir;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [renameScript, ...args], {
    cwd,
    encoding: "utf8",
  });
}

test("--help exits 0 and prints usage", () => {
  const dir = makeFixture();
  try {
    const result = run(dir, ["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /--name/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no args exits non-zero with usage hint", () => {
  const dir = makeFixture();
  try {
    const result = run(dir, []);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /at least one of --name, --slug, or --scope/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--dry-run does not modify files but reports planned changes", () => {
  const dir = makeFixture();
  try {
    const before = readFileSync(join(dir, "project.config.json"), "utf8");
    const result = run(dir, ["--dry-run", "--name", "Acme License", "--slug", "acme-license"]);
    assert.equal(result.status, 0);
    const after = readFileSync(join(dir, "project.config.json"), "utf8");
    assert.equal(after, before, "project.config.json must not change in dry-run");
    assert.match(result.stdout, /Acme License|acme-license|Dry run|preview/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("real run rewrites project.config.json + README", () => {
  const dir = makeFixture();
  try {
    const result = run(dir, ["--name", "Acme License", "--slug", "acme-license"]);
    assert.equal(result.status, 0);
    const config = JSON.parse(readFileSync(join(dir, "project.config.json"), "utf8"));
    assert.equal(config.projectName, "Acme License");
    assert.equal(config.projectSlug, "acme-license");
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    assert.match(readme, /Acme License/);
    assert.match(readme, /acme-license/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--scope rewrites @repo references", () => {
  const dir = makeFixture();
  try {
    const result = run(dir, ["--scope", "@acme"]);
    assert.equal(result.status, 0);
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    assert.match(readme, /@acme\/contracts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// silence unused import warning
void execFileSync;
