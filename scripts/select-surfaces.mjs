#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SURFACE_REGISTRY = {
  web: {
    appDir: "apps/web",
    envExamples: ["env/local/web.env.example", "env/production/web.env.example"],
    devScripts: ["dev:web"],
  },
  api: {
    appDir: "apps/api",
    envExamples: ["env/local/api.env.example", "env/production/api.env.example"],
    devScripts: ["dev:api"],
  },
  desktop: {
    appDir: "apps/desktop",
    envExamples: ["env/local/desktop.env.example", "env/production/desktop.env.example"],
    devScripts: ["dev:desktop"],
  },
  mobile: {
    appDir: "apps/mobile",
    envExamples: ["env/local/mobile.env.example", "env/production/mobile.env.example"],
    devScripts: ["dev:mobile"],
  },
  "mfe-host": {
    appDir: "apps/mfe-host",
    envExamples: ["env/local/mfe-host.env.example", "env/production/mfe-host.env.example"],
    devScripts: ["dev:mfe-host"],
  },
  "mfe-dashboard": {
    appDir: "apps/mfe-dashboard",
    envExamples: [],
    devScripts: ["dev:mfe-dashboard"],
  },
};

const ALL_SURFACES = Object.keys(SURFACE_REGISTRY);

const HELP = `Usage: pnpm template:surfaces [options]

Prune unwanted apps from this monorepo template. Pruned surfaces have their
app directory, env examples, and root dev:<surface> scripts removed.

Options:
  --keep <list>   Comma-separated list of surfaces to keep. All others are dropped.
  --drop <list>   Comma-separated list of surfaces to drop. Cannot combine with --keep.
  --apply         Actually perform the pruning. Without this flag the script is a dry run.
  --help          Show this message.

Surfaces:
  ${ALL_SURFACES.join(", ")}

Examples:
  pnpm template:surfaces --drop mobile,desktop
  pnpm template:surfaces --keep web,api --apply
`;

function writeStdout(message) {
  process.stdout.write(message);
}

function writeStderr(message) {
  process.stderr.write(message);
}

function parseList(value) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseArgs(argv) {
  const args = { keep: undefined, drop: undefined, apply: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--") {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }
    if (arg === "--keep") {
      if (next === undefined) {
        throw new Error("--keep requires a value");
      }
      args.keep = parseList(next);
      index += 1;
      continue;
    }
    if (arg === "--drop") {
      if (next === undefined) {
        throw new Error("--drop requires a value");
      }
      args.drop = parseList(next);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function resolveDropSet(args, configuredSurfaces) {
  if (args.keep && args.drop) {
    throw new Error("Use either --keep or --drop, not both.");
  }
  if (!args.keep && !args.drop) {
    throw new Error("Provide either --keep or --drop. Run with --help for usage.");
  }

  const known = new Set(ALL_SURFACES);
  const requested = args.keep ?? args.drop ?? [];
  for (const surface of requested) {
    if (!known.has(surface)) {
      throw new Error(`Unknown surface "${surface}". Known: ${ALL_SURFACES.join(", ")}`);
    }
  }

  if (args.keep) {
    const keep = new Set(args.keep);
    return configuredSurfaces.filter((surface) => !keep.has(surface));
  }
  return Array.from(new Set(args.drop));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(path, serialized, "utf8");
}

function rebuildMfeMetaScript(rootScripts, remainingSurfaces) {
  const filters = [];
  if (remainingSurfaces.includes("mfe-host")) filters.push("--filter @repo/mfe-host");
  if (remainingSurfaces.includes("mfe-dashboard")) filters.push("--filter @repo/mfe-dashboard");

  if (filters.length === 0) {
    delete rootScripts["dev:mfe"];
    return;
  }
  rootScripts["dev:mfe"] = `turbo run dev ${filters.join(" ")}`;
}

function removeReadmeMarkers(repoRoot, dropSet, planned) {
  const readmePath = join(repoRoot, "README.md");
  if (!existsSync(readmePath)) return;
  const original = readFileSync(readmePath, "utf8");

  let next = original;
  for (const surface of dropSet) {
    const pattern = new RegExp(
      `\\n?<!-- surface:${surface}:start -->[\\s\\S]*?<!-- surface:${surface}:end -->\\n?`,
      "g",
    );
    next = next.replace(pattern, "\n");
  }

  if (next !== original) {
    planned.readmeUpdate = readmePath;
    planned.readmeContent = next;
  }
}

function plan(repoRoot, dropSet, configuredSurfaces) {
  const planned = {
    appDirs: [],
    envExamples: [],
    scriptsToRemove: [],
    scriptsToRewrite: [],
    surfacesAfter: configuredSurfaces.filter((surface) => !dropSet.includes(surface)),
    rootPackagePath: join(repoRoot, "package.json"),
    configPath: join(repoRoot, "project.config.json"),
    readmeUpdate: null,
    readmeContent: null,
    orphanWarnings: [],
  };

  const rootPackage = readJson(planned.rootPackagePath);
  const nextScripts = { ...rootPackage.scripts };

  for (const surface of dropSet) {
    const meta = SURFACE_REGISTRY[surface];
    const appDir = join(repoRoot, meta.appDir);
    if (existsSync(appDir)) planned.appDirs.push(appDir);

    for (const exampleRel of meta.envExamples) {
      const examplePath = join(repoRoot, exampleRel);
      if (existsSync(examplePath)) planned.envExamples.push(examplePath);
    }

    for (const scriptName of meta.devScripts) {
      if (Object.hasOwn(nextScripts, scriptName)) {
        planned.scriptsToRemove.push(scriptName);
        delete nextScripts[scriptName];
      }
    }
  }

  if (Object.hasOwn(nextScripts, "dev:mfe")) {
    const before = nextScripts["dev:mfe"];
    rebuildMfeMetaScript(nextScripts, planned.surfacesAfter);
    const after = nextScripts["dev:mfe"];
    if (after === undefined) {
      planned.scriptsToRemove.push("dev:mfe");
    } else if (after !== before) {
      planned.scriptsToRewrite.push({ name: "dev:mfe", from: before, to: after });
    }
  }

  planned.nextScripts = nextScripts;
  planned.rootPackage = rootPackage;

  if (
    dropSet.includes("mfe-host") &&
    dropSet.includes("mfe-dashboard") &&
    existsSync(join(repoRoot, "packages/mfe"))
  ) {
    planned.orphanWarnings.push(
      "packages/mfe is now orphan (no remaining consumers). Delete it manually if not needed.",
    );
  }

  removeReadmeMarkers(repoRoot, dropSet, planned);

  return planned;
}

function applyPlan(repoRoot, planned) {
  for (const dir of planned.appDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  for (const file of planned.envExamples) {
    rmSync(file, { force: true });
  }

  const updatedPackage = { ...planned.rootPackage, scripts: planned.nextScripts };
  writeJson(planned.rootPackagePath, updatedPackage);

  const config = readJson(planned.configPath);
  config.surfaces = planned.surfacesAfter;
  writeJson(planned.configPath, config);

  if (planned.readmeUpdate && planned.readmeContent !== null) {
    writeFileSync(planned.readmeUpdate, planned.readmeContent, "utf8");
  }

  reformatRepo(repoRoot);
}

function reformatRepo(repoRoot) {
  const result = spawnSync("pnpm", ["format"], { cwd: repoRoot, stdio: "ignore" });
  if (result.status !== 0) {
    writeStderr(
      "Warning: `pnpm format` failed after pruning. Run it manually before committing.\n",
    );
  }
}

function printPlan(repoRoot, dropSet, planned, apply) {
  const banner = apply ? "Applying plan" : "Dry run (no changes written)";
  writeStdout(`${banner}\n\n`);

  writeStdout(`Surfaces to drop: ${dropSet.join(", ") || "(none)"}\n`);
  writeStdout(`Surfaces remaining: ${planned.surfacesAfter.join(", ") || "(none)"}\n\n`);

  writeStdout("Directories to remove:\n");
  if (planned.appDirs.length === 0) writeStdout("  (none)\n");
  for (const dir of planned.appDirs) writeStdout(`  - ${relative(repoRoot, dir)}\n`);
  writeStdout("\n");

  writeStdout("Env examples to remove:\n");
  if (planned.envExamples.length === 0) writeStdout("  (none)\n");
  for (const file of planned.envExamples) writeStdout(`  - ${relative(repoRoot, file)}\n`);
  writeStdout("\n");

  writeStdout("Root scripts to remove:\n");
  if (planned.scriptsToRemove.length === 0) writeStdout("  (none)\n");
  for (const name of planned.scriptsToRemove) writeStdout(`  - ${name}\n`);
  writeStdout("\n");

  writeStdout("Root scripts to rewrite:\n");
  if (planned.scriptsToRewrite.length === 0) writeStdout("  (none)\n");
  for (const change of planned.scriptsToRewrite) {
    writeStdout(`  - ${change.name}\n      ${change.from}\n      -> ${change.to}\n`);
  }
  writeStdout("\n");

  writeStdout(`README marker cleanup: ${planned.readmeUpdate ? "yes" : "(no markers matched)"}\n`);
  writeStdout(`project.config.json surfaces -> ${JSON.stringify(planned.surfacesAfter)}\n`);

  if (planned.orphanWarnings.length > 0) {
    writeStdout("\nWarnings:\n");
    for (const warning of planned.orphanWarnings) writeStdout(`  ! ${warning}\n`);
  }

  if (!apply) {
    writeStdout("\nRe-run with --apply to perform the changes.\n");
  }
}

function main() {
  const repoRoot = process.cwd();
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    writeStderr(`${error.message}\n\n${HELP}`);
    process.exit(1);
  }

  if (args.help) {
    writeStdout(HELP);
    return;
  }

  const configPath = join(repoRoot, "project.config.json");
  if (!existsSync(configPath)) {
    writeStderr(`project.config.json not found at ${configPath}\n`);
    process.exit(1);
  }
  const config = readJson(configPath);
  const configuredSurfaces = Array.isArray(config.surfaces) ? config.surfaces : ALL_SURFACES;

  let dropSet;
  try {
    dropSet = resolveDropSet(args, configuredSurfaces);
  } catch (error) {
    writeStderr(`${error.message}\n`);
    process.exit(1);
  }

  if (dropSet.length === 0) {
    writeStdout("Nothing to drop. Exiting.\n");
    return;
  }

  const planned = plan(repoRoot, dropSet, configuredSurfaces);
  printPlan(repoRoot, dropSet, planned, args.apply);

  if (args.apply) {
    applyPlan(repoRoot, planned);
    writeStdout("\nDone. Re-run `pnpm install` and `pnpm check` to verify the pruned shape.\n");
  }
}

main();
