# 0006 — Policy port, engine deferred

- **Status**: Accepted
- **Date**: 2026-04-28

## Context

Authorization in a solo product is usually a flat role / permission check ("does this user have
`notes:write`?"). As products grow, authorization shifts toward attribute-based access control
(ABAC): the decision depends on the _subject_ (user, roles, tenant), the _action_ (verb), the
_resource_ (with its own attributes — owner, status, classification), and request _context_ (IP,
time of day, MFA level). Sprinkling that logic across controllers via ad-hoc
`if (user.role === "admin")` checks is the failure mode this template wants to head off without
picking an engine on day one.

`@repo/auth/permissions.ts` already declares the permission _names_. What's missing is the
_evaluation_ contract: a stable shape for "may this query proceed?" that controllers, command
handlers, and audit code can frame against any backend (a few in-process rules, CASL, Cedar, OPA, or
a remote auth-service).

## Decision

Ship the policy contract as data-shape + Effect-typed evaluator port, with three reference adapters
and a fail-closed default.

- **Schema** — `@repo/contracts/policy.ts` exports `policyDecisionSchema` (`"allow"` / `"deny"`),
  `policySubjectSchema`, `policyResourceSchema`, `policyActionSchema`, `policyQuerySchema`. The
  action is a namespaced string (`<resource>:<verb>`); the schema keeps the namespace as a
  convention, not a constraint, so consumer codebases pick their own taxonomy.
- **Evaluator port** — `@repo/infrastructure/policy.ts` exports `PolicyEvaluator` (single method:
  `evaluate(query) → Effect<PolicyDecision, AppError>`).
- **Adapters** —
  - `allowAllPolicyEvaluator` (open by default; sentinel for "policy not wired here yet"),
  - `denyAllPolicyEvaluator` (fail-closed migrations),
  - `createMemoryPolicyEvaluator(rules)` — list of `(query) => "allow" | "deny" | "abstain"`
    predicates evaluated in order. First non-`"abstain"` wins; falls through to `"deny"` if no rule
    decides. Sufficient for single-tenant role checks and small ABAC rule sets.

`policyDecisionSchema` is binary (`allow` / `deny`) on purpose — `"abstain"` is internal to the rule
loop, not part of the contract. Callers receive a definitive decision; ambiguity is the engine's
problem to resolve.

## Consequences

- **Benefits**:
  - Controllers depend on `PolicyEvaluator`, not on a specific engine. Swapping in CASL or Cedar is
    a wiring change, not a refactor of every guard.
  - The query shape carries `tenantId` (via `PolicySubject`), so per-tenant rule scopes work on day
    one — important for the multi-tenant lane shipped in ADR
    [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md).
  - Solo deploys can ship `createMemoryPolicyEvaluator([roleCheck])` and stay there until the rule
    set outgrows it; the migration to a real engine is local to one wiring file.
  - Fail-closed default: forgetting to wire a rule produces `"deny"`, not silent permit. The failure
    mode is loud rather than security-leaking.
- **Costs**:
  - The query shape is more verbose than `if (user.role === "admin")`. Worth it once a single
    resource has more than two access rules, premature otherwise. The rule list adapter keeps the
    entry cost low.
  - Decisions are binary. A future ADR may extend with an `obligations` field (e.g. "allow, but
    redact field X") if a real consumer needs it; until then, callers compose multiple `evaluate`
    calls.
- **Risks / open questions**:
  - The relationship between `@repo/auth/permissions.ts` (named permissions) and policy actions is
    left to consumers. The natural mapping is "permission name → policy action", but enforcing it in
    the contract would foreclose on consumers that prefer per-resource actions (`notes:write` vs the
    broader `license:write` permission).
  - `PolicyResource.attributes` is `Record<string, unknown>` — the rule writer is responsible for
    the shape. A future helper could publish per-resource attribute schemas
    (`noteResourceAttributesSchema`) once the resource catalog stabilizes.

## Alternatives considered

- **Reuse `@repo/auth/permissions.ts` directly via a `userHasPermission()` helper**: rejected.
  Permission strings answer "what privileges does this user _have_?", not "may this _specific
  request_ proceed?" The latter needs the resource and context. Conflating them recreates the ad-hoc
  `if (role === "admin")` checks one rung up the abstraction.
- **Ship CASL as the default engine**: rejected per ADR
  [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md). CASL has its own ability
  syntax, condition DSL, and resource-class assumptions; baking it in makes "we use Cedar instead" a
  refactor rather than a wiring change.
- **Embed an OPA sidecar**: rejected. Heavy operational dependency for a template; OPA is a great
  target _adapter_, but a poor _default_. The rule-list adapter covers the in-process case until a
  real consumer activates the OPA path.
- **Tri-state decisions (`allow` / `deny` / `not-applicable`) at the contract level**: rejected.
  Pushes ambiguity onto callers, who then have to decide what to do with `not-applicable`. The
  engine should resolve to a definitive answer; `"abstain"` exists as an internal rule-loop signal,
  not part of `PolicyDecision`.

## References

- `packages/contracts/src/policy.ts` — schemas + types
- `packages/infrastructure/src/policy.ts` — `PolicyEvaluator` port + memory / allow-all / deny-all
- `packages/auth/src/permissions.ts` — permission names (separate concern, by design)
- ADR [0001 — Avoid day-one overreach](./0001-avoid-day-one-overreach.md) — parent principle
- ADR [0004 — Multi-tenancy contract](./0004-multi-tenancy-contract.md) — `tenantId` carries through
- CASL: <https://casl.js.org/> · AWS Cedar: <https://www.cedarpolicy.com/> · OPA:
  <https://www.openpolicyagent.org/>
