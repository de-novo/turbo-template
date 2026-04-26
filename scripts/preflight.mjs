#!/usr/bin/env node
// Preflight check: confirm the local toolchain matches what the template expects
// before `pnpm install` runs into a confusing error. Run via `pnpm doctor`.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const REQUIRED_NODE_MAJOR = 24;
const REQUIRED_PNPM_MAJOR = 10;

const checks = [];

function record(name, status, detail) {
  checks.push({ name, status, detail });
}

function bin(cmd) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function parseMajor(version) {
  if (!version) return null;
  const match = /^v?(\d+)\./.exec(version);
  return match ? Number(match[1]) : null;
}

// Node
const nodeVersion = process.versions.node;
const nodeMajor = parseMajor(nodeVersion);
if (nodeMajor === REQUIRED_NODE_MAJOR) {
  record("node", "ok", `v${nodeVersion}`);
} else {
  record(
    "node",
    "fail",
    `expected major ${REQUIRED_NODE_MAJOR}, got v${nodeVersion}. ` +
      `Install via 'nvm install ${REQUIRED_NODE_MAJOR}' or 'fnm install ${REQUIRED_NODE_MAJOR}', ` +
      `then re-run 'pnpm install'.`,
  );
}

// pnpm
const pnpmVersion = bin("pnpm -v");
const pnpmMajor = parseMajor(pnpmVersion);
if (pnpmMajor === REQUIRED_PNPM_MAJOR) {
  record("pnpm", "ok", `v${pnpmVersion}`);
} else if (pnpmVersion) {
  record(
    "pnpm",
    "fail",
    `expected major ${REQUIRED_PNPM_MAJOR}, got v${pnpmVersion}. ` +
      `Run 'corepack enable && corepack prepare pnpm@10 --activate'.`,
  );
} else {
  record(
    "pnpm",
    "fail",
    `pnpm not found on PATH. Run 'corepack enable && corepack prepare pnpm@10 --activate'.`,
  );
}

// git
const gitVersion = bin("git --version");
record("git", gitVersion ? "ok" : "fail", gitVersion ?? "not found on PATH");

// repo state
const inRepo = existsSync(".git");
record("repo", inRepo ? "ok" : "fail", inRepo ? "git repo" : "not inside a git repo");

// .nvmrc match
if (existsSync(".nvmrc")) {
  const nvmrc = readFileSync(".nvmrc", "utf8").trim();
  if (nvmrc.startsWith(String(REQUIRED_NODE_MAJOR))) {
    record(".nvmrc", "ok", nvmrc);
  } else {
    record(".nvmrc", "warn", `says '${nvmrc}', preflight expects major ${REQUIRED_NODE_MAJOR}`);
  }
}

// Render
const labelWidth = Math.max(...checks.map((c) => c.name.length));
const failures = checks.filter((c) => c.status === "fail");

for (const check of checks) {
  const symbol = check.status === "ok" ? "✓" : check.status === "warn" ? "!" : "✗";
  const padded = check.name.padEnd(labelWidth);
  process.stdout.write(`${symbol} ${padded}  ${check.detail}\n`);
}

if (failures.length === 0) {
  process.stdout.write(`\nAll ${checks.length} checks passed. Run 'pnpm install' next.\n`);
  process.exit(0);
}

process.stderr.write(
  `\n${failures.length} of ${checks.length} checks failed. Fix them and re-run 'pnpm doctor'.\n`,
);
process.exit(1);
