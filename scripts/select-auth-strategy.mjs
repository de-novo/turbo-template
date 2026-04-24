#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const AUTH_MODES = new Set([
  "better-auth-embedded",
  "external-oidc",
  "sso-gateway",
  "central-auth-service",
]);

const AUTH_TOPOLOGIES = new Set(["single-app", "modular-monolith", "msa"]);
const SERVICE_AUTH_MODES = new Set(["sso-gateway", "central-auth-service"]);

function writeStdout(message) {
  process.stdout.write(message);
}

function writeStderr(message) {
  process.stderr.write(message);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    issuerUrl: undefined,
    mode: undefined,
    serviceUrl: undefined,
    topology: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--") {
      continue;
    }

    if (arg === "--mode") {
      args.mode = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--topology") {
      args.topology = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--issuer-url") {
      args.issuerUrl = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--service-url") {
      args.serviceUrl = requireValue(arg, next);
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

  if (!args.mode || !AUTH_MODES.has(args.mode)) {
    throw new Error(`Provide --mode with one of: ${Array.from(AUTH_MODES).join(", ")}`);
  }

  if (!args.topology || !AUTH_TOPOLOGIES.has(args.topology)) {
    throw new Error(`Provide --topology with one of: ${Array.from(AUTH_TOPOLOGIES).join(", ")}`);
  }

  if (args.mode !== "better-auth-embedded" && !args.issuerUrl) {
    throw new Error(`--issuer-url is required when --mode is ${args.mode}`);
  }

  if (SERVICE_AUTH_MODES.has(args.mode) && !args.serviceUrl) {
    throw new Error(`--service-url is required when --mode is ${args.mode}`);
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
  writeStdout(`Usage:
  node scripts/select-auth-strategy.mjs --mode better-auth-embedded --topology modular-monolith
  node scripts/select-auth-strategy.mjs --mode external-oidc --topology modular-monolith --issuer-url https://idp.example.com
  node scripts/select-auth-strategy.mjs --mode central-auth-service --topology msa --issuer-url https://auth.example.com --service-url https://auth.example.com

Modes:
  better-auth-embedded
  external-oidc
  sso-gateway
  central-auth-service

Topologies:
  single-app
  modular-monolith
  msa
`);
}

function readJson(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

function replaceEnvValue(input, key, value) {
  const pattern = new RegExp(`^#?\\s*${key}=.*$`, "m");
  const line = `${key}=${value}`;

  if (pattern.test(input)) {
    return input.replace(pattern, line);
  }

  return `${input.trimEnd()}\n${line}\n`;
}

function rewriteEnv(path, updates) {
  let content = readFileSync(path, "utf8");

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      content = replaceEnvValue(content, key, value);
    }
  }

  return content;
}

function main() {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const projectConfigPath = join(root, "project.config.json");
  const projectConfig = readJson(projectConfigPath);

  const changes = [
    {
      path: projectConfigPath,
      content: `${JSON.stringify(
        {
          ...projectConfig,
          authMode: args.mode,
          authTopology: args.topology,
        },
        null,
        2,
      )}\n`,
    },
    {
      path: join(root, "env/local/api.env.example"),
      content: rewriteEnv(join(root, "env/local/api.env.example"), {
        AUTH_MODE: args.mode,
        AUTH_TOPOLOGY: args.topology,
        AUTH_ISSUER_URL: args.issuerUrl,
        AUTH_SERVICE_URL: args.serviceUrl,
      }),
    },
    {
      path: join(root, "env/production/api.env.example"),
      content: rewriteEnv(join(root, "env/production/api.env.example"), {
        AUTH_MODE: args.mode,
        AUTH_TOPOLOGY: args.topology,
        AUTH_ISSUER_URL: args.issuerUrl,
        AUTH_SERVICE_URL: args.serviceUrl,
      }),
    },
    {
      path: join(root, "env/local/web.env.example"),
      content: rewriteEnv(join(root, "env/local/web.env.example"), {
        NEXT_PUBLIC_AUTH_MODE: args.mode,
        NEXT_PUBLIC_AUTH_TOPOLOGY: args.topology,
        NEXT_PUBLIC_AUTH_ISSUER_URL: args.issuerUrl,
        NEXT_PUBLIC_AUTH_SERVICE_URL: args.serviceUrl,
      }),
    },
    {
      path: join(root, "env/production/web.env.example"),
      content: rewriteEnv(join(root, "env/production/web.env.example"), {
        NEXT_PUBLIC_AUTH_MODE: args.mode,
        NEXT_PUBLIC_AUTH_TOPOLOGY: args.topology,
        NEXT_PUBLIC_AUTH_ISSUER_URL: args.issuerUrl,
        NEXT_PUBLIC_AUTH_SERVICE_URL: args.serviceUrl,
      }),
    },
  ];

  const changed = changes.filter((change) => readFileSync(change.path, "utf8") !== change.content);

  if (args.dryRun) {
    for (const change of changed) {
      writeStdout(`${relative(root, change.path)}\n`);
    }
    writeStdout(`Dry run: ${changed.length} file(s) would change.\n`);
    return;
  }

  for (const change of changed) {
    writeFileSync(change.path, change.content);
    writeStdout(`updated ${relative(root, change.path)}\n`);
  }

  writeStdout(`Auth strategy selected: ${args.mode} / ${args.topology}\n`);
}

try {
  main();
} catch (error) {
  writeStderr(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
