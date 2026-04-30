import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const repoRoot = resolve(import.meta.dirname, "..");
const checker = resolve(repoRoot, "scripts/check-agent-rules.mjs");

function makeFixture({
  ruleBody = "",
  ruleFrontmatter = {},
  manifestPatch = {},
  includeSchema = true,
} = {}) {
  const dir = mkdtempSync(join(tmpdir(), "agent-rules-"));
  mkdirSync(join(dir, ".agents/rules/00-core"), { recursive: true });
  mkdirSync(join(dir, ".agents/skills/rule-management/schema"), { recursive: true });
  mkdirSync(join(dir, ".agents/adapters"), { recursive: true });

  const rulePath = ".agents/rules/00-core/agent-behavior.md";
  const manifest = {
    version: 1,
    entrypoint: "AGENTS.md",
    rulesRoot: ".agents/rules",
    naming: "{NN-category}/{rule-name}.md",
    rules: [{ id: "core.agent-behavior", path: rulePath, priority: 0 }],
    adapters: { claude: ".agents/adapters/claude.md" },
    skills: { "rule-management": ".agents/skills/rule-management/SKILL.md" },
    ruleSchema: ".agents/skills/rule-management/schema/rule.schema.json",
    ...manifestPatch,
  };

  const frontmatter = {
    id: "core.agent-behavior",
    name: "Agent Behavior",
    description: "Baseline behavior for agents.",
    summary: "Apply this rule for every task.",
    status: "active",
    priority: "0",
    severity: "critical",
    requires: [],
    conflictsWith: [],
    supersedes: [],
    owner: "platform",
    lastReviewed: "2026-04-30",
    ...ruleFrontmatter,
  };

  writeFileSync(join(dir, ".agents/manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  if (includeSchema) {
    writeFileSync(join(dir, ".agents/skills/rule-management/schema/rule.schema.json"), "{}\n");
  }
  writeFileSync(join(dir, "AGENTS.md"), `# AGENTS\n\nRead ${rulePath}\n`);
  writeFileSync(join(dir, ".agents/adapters/claude.md"), "# Claude\n");
  writeFileSync(
    join(dir, ".agents/skills/rule-management/SKILL.md"),
    `---\nname: rule-management\ndescription: Manage rules.\n---\n\n# Rule Management\n`,
  );
  writeFileSync(join(dir, rulePath), `${renderRuleFrontmatter(frontmatter)}\n${ruleBody}`);

  return dir;
}

function renderRuleFrontmatter(frontmatter) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key === "scope") continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${item}`);
      continue;
    }
    lines.push(`${key}: ${value}`);
  }
  lines.push("scope:", "  match:", "    any:", "      - projectWide: true", "---");
  return lines.join("\n");
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function runChecker(cwd) {
  return spawnSync("node", [checker], { cwd, encoding: "utf8" });
}

test("agent rules checker accepts a valid rule registry", () => {
  const dir = makeFixture({
    ruleBody: "# Agent Behavior\n\n## Required\n\n- Inspect real files.\n",
  });
  try {
    const result = runChecker(dir);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Agent rules are valid \(1 rules, 1 skills\)/);
  } finally {
    cleanup(dir);
  }
});

test("agent rules checker rejects missing bundled schema", () => {
  const dir = makeFixture({ includeSchema: false });
  try {
    const result = runChecker(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /rule\.schema\.json does not exist/);
  } finally {
    cleanup(dir);
  }
});

test("agent rules checker rejects missing scope signals", () => {
  const dir = makeFixture();
  try {
    const rulePath = join(dir, ".agents/rules/00-core/agent-behavior.md");
    writeFileSync(
      rulePath,
      `---\nid: core.agent-behavior\nname: Agent Behavior\ndescription: Baseline behavior.\nsummary: Apply everywhere.\nstatus: active\npriority: 0\nseverity: critical\nscope:\n  match:\n    any:\nrequires: []\nowner: platform\nlastReviewed: 2026-04-30\n---\n`,
    );
    const result = runChecker(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /scope\.match\.any must include at least one signal/);
  } finally {
    cleanup(dir);
  }
});

test("agent rules checker rejects unknown requires references", () => {
  const dir = makeFixture({ ruleFrontmatter: { requires: ["missing.rule"] } });
  try {
    const result = runChecker(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires unknown rule missing\.rule/);
  } finally {
    cleanup(dir);
  }
});

test("agent rules checker rejects direct Required and Forbidden contradictions", () => {
  const dir = makeFixture({
    ruleBody:
      "# Agent Behavior\n\n## Required\n\n- Use portless domains\n\n## Forbidden\n\n- Use portless domains\n",
  });
  try {
    const result = runChecker(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /direct Required\/Forbidden contradiction/);
  } finally {
    cleanup(dir);
  }
});
