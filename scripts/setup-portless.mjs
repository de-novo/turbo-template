#!/usr/bin/env node
// Install and prepare the recommended global portless CLI for local dev.
// Keeps the repo-local devDependency as the reproducible fallback used by pnpm scripts.

import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"));
const skipInstall = args.has("--skip-install");
const skipTrust = args.has("--skip-trust");
const startProxy = args.has("--start-proxy");
const unprivileged = args.has("--unprivileged");

function run(label, command, commandArgs) {
  process.stdout.write(`\n→ ${label}\n`);
  const res = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (res.status !== 0) {
    process.stderr.write(`\n✗ ${label} failed (exit ${res.status}).\n`);
    process.exit(res.status ?? 1);
  }
}

if (!skipInstall) {
  run("Install global portless", "npm", ["install", "-g", "portless@latest"]);
}

run("Verify global portless", "portless", ["--version"]);

if (!skipTrust) {
  run("Trust portless local CA", "portless", ["trust"]);
}

if (startProxy) {
  const proxyArgs = unprivileged
    ? ["proxy", "start", "--port", "1355", "--https"]
    : ["proxy", "start", "--https"];
  run("Start portless proxy", "portless", proxyArgs);
}

process.stdout.write("\n✓ Global portless setup complete.\n");
