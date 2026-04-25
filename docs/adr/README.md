# Architecture Decision Records

This directory holds the lightweight ADRs (Architecture Decision
Records) that capture decisions whose rationale is not obvious from
the code alone. The format is intentionally compact — Michael Nygard
style — so the cost of writing one is low.

## When to add an ADR

Open an ADR for any decision that:

- Crosses package or app boundaries.
- Constrains a future change (e.g. "do not introduce X").
- Is non-obvious to a contributor reading the code five months later.
- Has been argued and decided — write down the rejected options and
  why, not just the picked one.

Skip an ADR for:

- Routine refactors, bug fixes, dep bumps, doc edits.
- Patterns already documented in `docs/template-strategy.md`,
  `docs/capabilities.md`, or a package-level README.

## How

1. Copy `_template.md` to `NNNN-short-kebab-title.md` where `NNNN` is
   the next four-digit number.
2. Fill in the sections. Keep each section short — bullets are fine.
3. Update the index below.
4. Commit with `docs(adr): NNNN <short title>` so the history is
   greppable.
5. Open the PR. The ADR is the durable artifact; the PR description
   can stay short.

## Statuses

- **Proposed** — open for discussion.
- **Accepted** — the decision is in effect; code reflects it.
- **Superseded by NNNN** — replaced by a later ADR. Keep the file
  for historical context; do not delete.
- **Rejected** — recorded so we don't relitigate.

## Index

- [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md)
  · Accepted
- [0002 — Per-app env loaders with foreign-key guards](./0002-per-app-env-loaders.md)
  · Accepted
