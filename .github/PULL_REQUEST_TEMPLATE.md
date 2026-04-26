<!--
  PR description should answer "what is changing and why".
  The full structured commit body lives on the commit itself; mirror its
  rationale here so reviewers don't need to read both.

  This repo does NOT use Conventional Commits. See CONTRIBUTING.md for the
  Constraint / Rejected / Confidence / Scope-risk / Directive / Tested /
  Not-tested commit body convention.
-->

## Summary

<!-- One paragraph: what changed, why, and the user-facing effect (if any). -->

## Constraints honored

<!-- Bullets of invariants the change must preserve. Mirror the commit body. -->

-

## Alternatives rejected

<!-- The load-bearing options you considered and why they were rejected. -->

-

## Verification

<!-- Check off the gates run locally; CI re-runs them. -->

- [ ] `pnpm check` (lint + tsconfig + typecheck + format + env + design)
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm syncpack:check`
- [ ] `pnpm licenses:check`
- [ ] `pnpm audit --prod --audit-level=high`
- [ ] (if web touched) `pnpm test:e2e`
- [ ] (if web touched) `apps/web/next-env.d.ts` is restored to the build form

## Tested / Not tested

<!--
  Tested: <command 1>
  Tested: <command 2>
  Not-tested: <thing left unverified>
-->

## Related

<!-- Closes #123 / Refs #456 / docs/adr/NNNN-... / issue link -->
