import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { loadApiEnv } from "./apps/api.js";
import { loadDesktopEnv } from "./apps/desktop.js";
import { loadMobileEnv } from "./apps/mobile.js";
import { loadWebEnv } from "./apps/web.js";
import type { EnvSource } from "./source.js";

const appLoaders = {
  api: loadApiEnv,
  desktop: loadDesktopEnv,
  mobile: loadMobileEnv,
  web: loadWebEnv,
} as const;

type AppName = keyof typeof appLoaders;

const envRoot = join(process.cwd(), "../../env");
const failures: string[] = [];

for (const environment of readdirSync(envRoot, { withFileTypes: true })) {
  if (!environment.isDirectory()) {
    continue;
  }

  const environmentPath = join(envRoot, environment.name);
  for (const file of readdirSync(environmentPath, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".env.example")) {
      continue;
    }

    const appName = basename(file.name, ".env.example");
    if (!isAppName(appName)) {
      failures.push(`${environment.name}/${file.name}: unknown app name "${appName}"`);
      continue;
    }

    const source = parseEnvFile(join(environmentPath, file.name));

    try {
      appLoaders[appName](source);
    } catch (error) {
      failures.push(
        `${environment.name}/${file.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Env examples are valid.\n");

function isAppName(value: string): value is AppName {
  return value in appLoaders;
}

function parseEnvFile(path: string): EnvSource {
  const source: EnvSource = {};
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    source[key] = unquote(value);
  }

  return source;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
