import type { PolicyDecision, PolicyQuery } from "@repo/contracts";
import type { AppError } from "@repo/platform";
import { Effect } from "effect";

/**
 * Authorization evaluator port. Consumers ask "may this query proceed?"
 * and receive `allow` / `deny`. Errors (resource lookup failure, engine
 * unreachable) flow through `AppError` so callers can map them to the
 * usual HTTP envelope.
 *
 * The shipped adapters cover the common cases:
 * - `allowAllPolicyEvaluator` — solo / dev default; useful as a sentinel
 *   so test fixtures can assert "no policy was wired here yet".
 * - `denyAllPolicyEvaluator` — useful for fail-closed migrations.
 * - `createMemoryPolicyEvaluator(rules)` — a rule list evaluated in order;
 *   the first rule to return `"allow"` or `"deny"` wins, `"abstain"`
 *   continues to the next rule. The final default if no rule decides is
 *   `"deny"` (fail-closed).
 *
 * Real engines (CASL, Cedar, OPA, custom service) plug in by implementing
 * `PolicyEvaluator`. See ADR docs/adr/0006-policy-port.md.
 */
export type PolicyEvaluator = {
  evaluate(query: PolicyQuery): Effect.Effect<PolicyDecision, AppError>;
};

export const allowAllPolicyEvaluator: PolicyEvaluator = {
  evaluate: () => Effect.succeed("allow"),
};

export const denyAllPolicyEvaluator: PolicyEvaluator = {
  evaluate: () => Effect.succeed("deny"),
};

export type PolicyRule = (query: PolicyQuery) => "allow" | "deny" | "abstain";

export function createMemoryPolicyEvaluator(rules: ReadonlyArray<PolicyRule>): PolicyEvaluator {
  return {
    evaluate: (query) =>
      Effect.sync(() => {
        for (const rule of rules) {
          const decision = rule(query);
          if (decision !== "abstain") {
            return decision;
          }
        }
        return "deny";
      }),
  };
}
