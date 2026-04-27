#!/usr/bin/env node
// Onboarding bootstrap. Designed to be safe to re-run: every step is idempotent
// and skips work that's already done. Run via `pnpm setup`.
//
// What this does:
//   1. Runs preflight (Node/pnpm/git checks) — bails early on a wrong toolchain.
//   2. Runs `pnpm install` if `node_modules/` looks unpopulated.
//   3. Copies `env/local/*.env.example` to each app's canonical dev location
//      (api/.env, web/.env.local, desktop/.env, mobile/.env.local,
//      mfe-host/.env), but only when the destination doesn't already exist.
//      Pass `--force` to overwrite.
//   4. Prints the suggested next commands.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const force = args.has("--force") || args.has("-f");
const skipInstall = args.has("--skip-install");
const skipPreflight = args.has("--skip-preflight");

const ENV_PAIRS = [
  { example: "env/local/api.env.example", dest: "apps/api/.env" },
  { example: "env/local/web.env.example", dest: "apps/web/.env.local" },
  { example: "env/local/desktop.env.example", dest: "apps/desktop/.env" },
  { example: "env/local/mobile.env.example", dest: "apps/mobile/.env.local" },
  { example: "env/local/mfe-host.env.example", dest: "apps/mfe-host/.env" },
];

function step(label, body) {
  process.stdout.write(`\n→ ${label}\n`);
  return body();
}

function run(label, command, args) {
  const res = spawnSync(command, args, { stdio: "inherit", cwd: repoRoot });
  if (res.status !== 0) {
    process.stderr.write(
      `\n✗ ${label} failed (exit ${res.status}). Fix the error above and re-run \`pnpm setup\`.\n`,
    );
    process.exit(res.status ?? 1);
  }
}

step("Preflight (Node, pnpm, git)", () => {
  if (skipPreflight) {
    process.stdout.write("  (skipped via --skip-preflight)\n");
    return;
  }
  run("preflight", "node", ["scripts/preflight.mjs"]);
});

step("Install dependencies", () => {
  if (skipInstall) {
    process.stdout.write("  (skipped via --skip-install)\n");
    return;
  }
  // Heuristic: if node_modules/.pnpm exists, pnpm has populated the store. Run
  // anyway with `--prefer-offline` so a re-run is cheap and picks up lockfile
  // drift.
  const populated = existsSync(resolve(repoRoot, "node_modules/.pnpm"));
  const flags = populated ? ["install", "--prefer-offline"] : ["install"];
  run("pnpm install", "pnpm", flags);
});

const envResults = step("Provision local env files", () => {
  const results = [];
  for (const { example, dest } of ENV_PAIRS) {
    const src = resolve(repoRoot, example);
    const target = resolve(repoRoot, dest);
    if (!existsSync(src)) {
      results.push({ dest, status: "missing-source", src: example });
      continue;
    }
    if (existsSync(target) && !force) {
      results.push({ dest, status: "exists" });
      continue;
    }
    copyFileSync(src, target);
    results.push({ dest, status: existsSync(target) && force ? "overwritten" : "created" });
  }
  return results;
});

const labelWidth = Math.max(...envResults.map((r) => r.dest.length));
for (const r of envResults) {
  const symbol =
    r.status === "created" || r.status === "overwritten" ? "+" : r.status === "exists" ? "·" : "!";
  const note =
    r.status === "created"
      ? "copied from example"
      : r.status === "overwritten"
        ? "overwritten via --force"
        : r.status === "exists"
          ? "already present (pass --force to overwrite)"
          : `example missing: ${r.src}`;
  process.stdout.write(`  ${symbol} ${r.dest.padEnd(labelWidth)}  ${note}\n`);
}

step("Suggested next commands", () => {
  const lines = [
    "  pnpm dev                 # turbo run dev across every surface",
    "  pnpm dev:api             # API only (memory adapter; no DB needed)",
    "  pnpm dev:web             # Web only",
    "",
    "  # If you want persistent auth/sessions and the notes example:",
    "  pnpm dev:db              # docker compose up postgres",
    "  pnpm db:migrate          # apply Drizzle migrations",
    "  pnpm dev:api             # boots with DATABASE_URL → Drizzle adapter",
    "",
    "  pnpm check               # lint + typecheck + format + env + design (CI gate)",
    "",
    "  open http://localhost:4000/docs   # Scalar UI for the API",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
});

process.stdout.write("\n✓ Setup complete.\n");
