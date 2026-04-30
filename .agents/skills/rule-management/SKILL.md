---
name: rule-management
description:
  Manage structured agent rules, manifests, adapters, and validation checks across projects.
---

# Rule Management

Use this skill when adding, editing, moving, deleting, reviewing, syncing, or validating structured
agent rules in any project.

## Project Discovery

Before changing rules, discover the project's rule system instead of assuming fixed paths:

1. Find the project entrypoint for agent guidance, such as a root instruction file.
2. Find the machine-readable manifest or index, if one exists.
3. Find the canonical rules root and its naming convention.
4. Find tool-specific adapters or generated projections.
5. Find the project validation command for rule structure and contradiction checks.
6. If any of these are missing, propose the smallest project-local convention before adding rules.

## Source Of Truth

Keep these responsibilities separate:

- Entrypoint: short human/agent index plus hard overrides.
- Rule files: canonical detailed policy source.
- Manifest: machine-readable index of rules, skills, adapters, priorities, and scopes.
- Adapters: tool-specific projections only, not canonical policy.
- Management skill: process guidance for safely changing the rule system.

## Rule Path Contract

Prefer an ordered category layout when the project has no existing convention:

```text
{rulesRoot}/{NN-category}/{rule-name}.md
```

Examples:

```text
{rulesRoot}/00-core/agent-behavior.md
{rulesRoot}/20-dev-runtime/local-runtime.md
{rulesRoot}/40-git-and-review/git-workflow.md
```

Rules:

- `NN` is a two-digit ordering prefix.
- `category` is lowercase kebab-case.
- `rule-name` is lowercase kebab-case.
- One file should cover one coherent rule area.
- Split a file when it mixes unrelated change triggers, owners, or validation scopes.

## Rule File Contract

This skill ships a reusable JSON Schema at `schema/rule.schema.json`. When adopting the skill in a
project, either point the project manifest to that schema or copy it deliberately if the project
needs a forked contract.

Prefer skill-like frontmatter when the project has no existing rule metadata format:

```md
---
id: category.rule-name
name: category.rule-name
description: One sentence describing when this rule applies.
summary: >
  Explain when to apply this rule, including affected capabilities, user intents, and common file or
  package signals.
status: active
priority: 20
severity: high
scope:
  match:
    any:
      - packageDependency: framework-or-library
      - fileExists: config-file.*
      - fileGlob: "**/relevant-path/**"
      - userTrigger: natural-language-trigger
  exclude:
    - "**/generated/**"
requires:
  - core.agent-behavior
conflictsWith: []
supersedes: []
owner: platform
lastReviewed: 2026-04-30
---
```

Then use short, testable sections:

```md
# Human Title

## Required

- ...

## Forbidden

- ...

## Allowed Exceptions

- ...
```

Prefer concrete behavior over philosophy. If a rule cannot be followed or verified, rewrite it until
it can.

The header decides when the rule should be read. The body decides how to act after the rule applies.
Prefer capability signals such as package dependencies, config files, file globs, and user triggers
over enumerating every current app path.

## Add A Rule

1. Pick the smallest fitting category under the discovered rules root.
2. Create a focused rule file with the project's required metadata and sections.
3. Add a matching manifest/index entry if the project uses one.
4. Describe applicability in the header using scope signals rather than only concrete paths.
5. Link from the entrypoint only if the rule belongs in the minimum read order or hard overrides.
6. Run the contradiction audit.
7. Run the project rule validator and the relevant project gate.

## Edit A Rule

1. Update the canonical rule file first.
2. Update the entrypoint only when hard overrides, read order, or top-level routing changed.
3. Update adapters only when a tool needs a different projection of the same canonical rule.
4. Run the contradiction audit.
5. Run the project rule validator and whitespace/diff checks.

## Move Or Rename A Rule

1. Move the file.
2. Update manifest/index path, id, priority, and scope metadata if used.
3. Update frontmatter or equivalent metadata to match the manifest/index.
4. Update all links from the entrypoint, adapters, and related rule files.
5. Run the contradiction audit.
6. Run the project rule validator.

## Delete A Rule

1. Confirm the rule is obsolete, duplicated, or merged into another rule.
2. Remove the canonical rule file.
3. Remove its manifest/index entry if used.
4. Remove links from the entrypoint and adapters.
5. Run the contradiction audit.
6. Run the project rule validator.

## Contradiction Audit

Run this audit whenever a rule changes:

1. Compare the changed rule with entrypoint hard overrides.
2. Compare it with neighboring rules in the same category.
3. Search for the same subject across all rules.
4. Check `Required`, `Forbidden`, and `Allowed Exceptions` together.
5. If two rules conflict, prefer the stricter or safety-preserving rule by default.
6. Move legitimate carveouts into `Allowed Exceptions` instead of hiding them in prose.
7. If source, docs, config, or scripts disagree with the rule, update the stale side or record an
   explicit follow-up.

## Validation Expectations

A good project rule validator should check:

- Manifest/index paths exist.
- Rule paths match the project naming convention.
- Rule metadata names match manifest/index ids.
- Required metadata such as `description` is present.
- Every canonical rule file is indexed when an index exists.
- The entrypoint references the minimum required rule set.
- Adapter paths exist when listed.
- Skill paths and skill metadata are valid when skills are listed.
- Direct Required/Forbidden bullet collisions are absent.

## Commit Guidance

Rule-management commits should explain:

- Which rule category changed.
- Whether the change is policy, structure, adapter-only, skill-only, or validation-only.
- Which validators and project gates ran.
- Whether downstream projects need to copy the new policy, the mechanism, or both.
