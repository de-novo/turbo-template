#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { relative } from "node:path";

const manifestPath = ".agents/manifest.json";
const agentsPath = "AGENTS.md";
const rulePathPattern = /^\.agents\/rules\/\d{2}-[a-z0-9-]+\/[a-z0-9-]+\.md$/;
const requiredRuleFrontmatterKeys = [
  "id",
  "name",
  "description",
  "summary",
  "status",
  "priority",
  "severity",
  "scope",
  "requires",
  "owner",
  "lastReviewed",
];

function fail(message) {
  process.stderr.write(`Agent rules check failed: ${message}\n`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`could not parse ${path}: ${error.message}`);
  }
}

async function listRuleFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) =>
      relative(process.cwd(), `${entry.parentPath}/${entry.name}`).replaceAll("\\", "/"),
    )
    .sort();
}

function parseFrontmatter(path) {
  const content = readFileSync(path, "utf8");
  if (!content.startsWith("---\n")) fail(`${path} is missing frontmatter`);
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) fail(`${path} has unterminated frontmatter`);
  const raw = content.slice(4, end);
  const fields = new Map();
  for (const line of raw.split("\n")) {
    const match = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
    if (match) fields.set(match[1], match[2]);
  }
  return fields;
}

function frontmatterRaw(path) {
  const content = readFileSync(path, "utf8");
  if (!content.startsWith("---\n")) fail(`${path} is missing frontmatter`);
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) fail(`${path} has unterminated frontmatter`);
  return content.slice(4, end);
}

function hasFrontmatterKey(path, key) {
  return frontmatterRaw(path)
    .split("\n")
    .some((line) => line.match(new RegExp(`^${key}:`)));
}

function parseFrontmatterArray(raw, key) {
  const lines = raw.split("\n");
  const start = lines.indexOf(`${key}:`);
  if (start === -1) return [];
  const values = [];
  for (const line of lines.slice(start + 1)) {
    if (line.match(/^[a-zA-Z][a-zA-Z0-9_-]*:/)) break;
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (match) values.push(match[1].replace(/^["']|["']$/g, ""));
  }
  return values;
}

function validateRuleFrontmatter(rule, frontmatter) {
  const raw = frontmatterRaw(rule.path);
  for (const key of requiredRuleFrontmatterKeys) {
    if (!hasFrontmatterKey(rule.path, key)) fail(`${rule.path} needs frontmatter ${key}`);
  }
  if (frontmatter.get("id") !== rule.id) {
    fail(`${rule.path} frontmatter id must equal manifest id ${rule.id}`);
  }
  if (
    frontmatter.get("status") &&
    !["draft", "active", "deprecated", "removed"].includes(frontmatter.get("status"))
  ) {
    fail(`${rule.path} has invalid status ${frontmatter.get("status")}`);
  }
  if (
    frontmatter.get("severity") &&
    !["info", "low", "medium", "high", "critical"].includes(frontmatter.get("severity"))
  ) {
    fail(`${rule.path} has invalid severity ${frontmatter.get("severity")}`);
  }
  const priority = Number(frontmatter.get("priority"));
  if (!Number.isInteger(priority) || priority < 0) fail(`${rule.path} needs integer priority >= 0`);
  if (priority !== rule.priority) {
    fail(`${rule.path} priority ${priority} must equal manifest priority ${rule.priority}`);
  }
  if (!raw.includes("scope:\n") || !raw.includes("  match:\n") || !raw.includes("    any:\n")) {
    fail(`${rule.path} needs scope.match.any`);
  }
  if (!raw.match(/^\s{6}-\s+[a-zA-Z][a-zA-Z0-9]*:/m)) {
    fail(`${rule.path} scope.match.any must include at least one signal`);
  }
  for (const dependency of parseFrontmatterArray(raw, "requires")) {
    if (dependency && !manifestRuleIds.has(dependency)) {
      fail(`${rule.path} requires unknown rule ${dependency}`);
    }
  }
  for (const conflict of parseFrontmatterArray(raw, "conflictsWith")) {
    if (conflict && !manifestRuleIds.has(conflict)) {
      fail(`${rule.path} conflictsWith unknown rule ${conflict}`);
    }
  }
}

function stripFrontmatter(content) {
  if (!content.startsWith("---\n")) return content;
  const end = content.indexOf("\n---\n", 4);
  return end === -1 ? content : content.slice(end + "\n---\n".length);
}

function normalizeBullet(line) {
  return line
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/[.:;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function collectSectionBullets(path, sectionName) {
  const content = stripFrontmatter(readFileSync(path, "utf8"));
  const lines = content.split("\n");
  const bullets = [];
  let inSection = false;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      inSection = heading[1].trim().toLowerCase() === sectionName.toLowerCase();
      continue;
    }
    if (!inSection || !line.match(/^[-*]\s+/)) continue;
    const normalized = normalizeBullet(line);
    if (normalized) bullets.push({ path, text: normalized });
  }

  return bullets;
}

function assertNoDirectContradictions(rulePaths) {
  const required = [];
  const forbidden = [];
  for (const path of rulePaths) {
    required.push(...collectSectionBullets(path, "Required"));
    forbidden.push(...collectSectionBullets(path, "Forbidden"));
  }

  const forbiddenByText = new Map();
  for (const item of forbidden) {
    const paths = forbiddenByText.get(item.text) ?? [];
    paths.push(item.path);
    forbiddenByText.set(item.text, paths);
  }

  for (const item of required) {
    const forbiddenPaths = forbiddenByText.get(item.text);
    if (!forbiddenPaths) continue;
    fail(
      `direct Required/Forbidden contradiction for "${item.text}" in ${item.path} and ${forbiddenPaths.join(
        ", ",
      )}`,
    );
  }
}

function validateSkill(name, path) {
  if (!path || typeof path !== "string") fail(`skill ${name} needs a string path`);
  if (!/^\.agents\/skills\/[a-z0-9-]+\/SKILL\.md$/.test(path)) {
    fail(`${path} must match .agents/skills/{skill-name}/SKILL.md`);
  }
  if (!existsSync(path)) fail(`skill ${path} does not exist`);
  const frontmatter = parseFrontmatter(path);
  if (frontmatter.get("name") !== name) {
    fail(`${path} frontmatter name must equal manifest skill key ${name}`);
  }
  if (!hasFrontmatterKey(path, "description")) fail(`${path} needs frontmatter description`);
}

const manifest = readJson(manifestPath);
const ruleSchemaPath =
  manifest.ruleSchema ?? ".agents/skills/rule-management/schema/rule.schema.json";
if (!existsSync(ruleSchemaPath)) fail(`${ruleSchemaPath} does not exist`);
if (manifest.version !== 1) fail("manifest.version must be 1");
if (manifest.entrypoint !== agentsPath) fail(`manifest.entrypoint must be ${agentsPath}`);
if (manifest.rulesRoot !== ".agents/rules") fail("manifest.rulesRoot must be .agents/rules");
if (!Array.isArray(manifest.rules) || manifest.rules.length === 0) fail("manifest.rules is empty");
if (!existsSync(agentsPath)) fail(`${agentsPath} does not exist`);

const seenIds = new Set();
const seenPaths = new Set();
const manifestRuleIds = new Set(manifest.rules.map((rule) => rule.id));
for (const rule of manifest.rules) {
  if (!rule.id || typeof rule.id !== "string") fail("every rule needs a string id");
  if (seenIds.has(rule.id)) fail(`duplicate rule id ${rule.id}`);
  seenIds.add(rule.id);

  if (!rule.path || typeof rule.path !== "string") fail(`${rule.id} needs a string path`);
  if (seenPaths.has(rule.path)) fail(`duplicate rule path ${rule.path}`);
  seenPaths.add(rule.path);

  if (!rulePathPattern.test(rule.path))
    fail(`${rule.path} must match .agents/rules/{NN-category}/{rule-name}.md`);
  if (!existsSync(rule.path)) fail(`${rule.path} does not exist`);
  if (!Number.isInteger(rule.priority)) fail(`${rule.id} needs integer priority`);

  const frontmatter = parseFrontmatter(rule.path);
  validateRuleFrontmatter(rule, frontmatter);
}

const ruleFiles = await listRuleFiles(".agents/rules");
const missingFromManifest = ruleFiles.filter((path) => !seenPaths.has(path));
if (missingFromManifest.length > 0) {
  fail(`rule files missing from manifest: ${missingFromManifest.join(", ")}`);
}
assertNoDirectContradictions(ruleFiles);

const agents = readFileSync(agentsPath, "utf8");
for (const rulePath of seenPaths) {
  if (!agents.includes(rulePath)) fail(`${agentsPath} does not reference ${rulePath}`);
}

for (const adapterPath of Object.values(manifest.adapters ?? {})) {
  if (!existsSync(adapterPath)) fail(`adapter ${adapterPath} does not exist`);
}

for (const [name, path] of Object.entries(manifest.skills ?? {})) {
  validateSkill(name, path);
}

process.stdout.write(
  `Agent rules are valid (${manifest.rules.length} rules, ${
    Object.keys(manifest.skills ?? {}).length
  } skills).\n`,
);
