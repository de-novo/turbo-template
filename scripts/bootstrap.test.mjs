// Smoke tests for scripts/bootstrap.mjs.
// Run via `pnpm test:scripts` (which invokes `node --test`).
//
// We exercise the script via spawn against a temporary fixture so the real
// repo never changes. Preflight + pnpm install are skipped via flags.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const repoRoot = resolve(import.meta.dirname, "..");
const bootstrapScript = resolve(repoRoot, "scripts/bootstrap.mjs");

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), "bootstrap-"));
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "env/local"), { recursive: true });
  mkdirSync(join(dir, "apps/api"), { recursive: true });
  mkdirSync(join(dir, "apps/web"), { recursive: true });
  mkdirSync(join(dir, "apps/desktop"), { recursive: true });
  mkdirSync(join(dir, "apps/mobile"), { recursive: true });
  mkdirSync(join(dir, "apps/mfe-host"), { recursive: true });
  mkdirSync(join(dir, "node_modules/.pnpm"), { recursive: true });

  copyFileSync(bootstrapScript, join(dir, "scripts/bootstrap.mjs"));
  writeFileSync(join(dir, "env/local/api.env.example"), "API_KEY=local\n");
  writeFileSync(
    join(dir, "env/local/web.env.example"),
    "NEXT_PUBLIC_API_URL=http://localhost:4000\n",
  );
  writeFileSync(join(dir, "env/local/desktop.env.example"), "VITE_API_URL=http://localhost:4000\n");
  writeFileSync(
    join(dir, "env/local/mobile.env.example"),
    "EXPO_PUBLIC_API_URL=http://localhost:4000\n",
  );
  writeFileSync(
    join(dir, "env/local/mfe-host.env.example"),
    "VITE_MFE_HOST_URL=http://localhost:3100\n",
  );
  return dir;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function runBootstrap(cwd, extraArgs = []) {
  return spawnSync(
    "node",
    ["scripts/bootstrap.mjs", "--skip-preflight", "--skip-install", ...extraArgs],
    { cwd, encoding: "utf8" },
  );
}

test("bootstrap copies env examples to canonical app locations on first run", () => {
  const dir = makeFixture();
  try {
    const result = runBootstrap(dir);
    assert.equal(result.status, 0, `bootstrap exited non-zero:\n${result.stderr}`);
    assert.equal(readFileSync(join(dir, "apps/api/.env"), "utf8"), "API_KEY=local\n");
    assert.equal(
      readFileSync(join(dir, "apps/web/.env.local"), "utf8"),
      "NEXT_PUBLIC_API_URL=http://localhost:4000\n",
    );
    assert.equal(
      readFileSync(join(dir, "apps/desktop/.env"), "utf8"),
      "VITE_API_URL=http://localhost:4000\n",
    );
    assert.equal(
      readFileSync(join(dir, "apps/mobile/.env.local"), "utf8"),
      "EXPO_PUBLIC_API_URL=http://localhost:4000\n",
    );
    assert.equal(
      readFileSync(join(dir, "apps/mfe-host/.env"), "utf8"),
      "VITE_MFE_HOST_URL=http://localhost:3100\n",
    );
  } finally {
    cleanup(dir);
  }
});

test("bootstrap does not overwrite existing env files without --force", () => {
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, "apps/api/.env"), "API_KEY=user-edited\n");
    const result = runBootstrap(dir);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(join(dir, "apps/api/.env"), "utf8"), "API_KEY=user-edited\n");
    assert.match(result.stdout, /already present/);
  } finally {
    cleanup(dir);
  }
});

test("bootstrap overwrites with --force", () => {
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, "apps/api/.env"), "API_KEY=user-edited\n");
    const result = runBootstrap(dir, ["--force"]);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(join(dir, "apps/api/.env"), "utf8"), "API_KEY=local\n");
  } finally {
    cleanup(dir);
  }
});

test("bootstrap is idempotent across re-runs", () => {
  const dir = makeFixture();
  try {
    const first = runBootstrap(dir);
    const second = runBootstrap(dir);
    assert.equal(first.status, 0);
    assert.equal(second.status, 0);
    assert.match(first.stdout, /copied from example/);
    assert.doesNotMatch(second.stdout, /copied from example/);
    assert.match(second.stdout, /already present/);
  } finally {
    cleanup(dir);
  }
});
