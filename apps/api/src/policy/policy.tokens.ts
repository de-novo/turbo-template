/**
 * DI token for the active `PolicyEvaluator`. Default is
 * `allowAllPolicyEvaluator` (provided by `PolicyModule`); a fork swaps
 * the provider value to a real engine — see
 * `docs/recipes/enable-policy.md`.
 *
 * Allow-all is the *application-level* default, distinct from the
 * fail-closed default inside `createMemoryPolicyEvaluator`'s rule
 * loop. Reasoning: the lane is inert until handlers actually call
 * `evaluator.evaluate(...)`, and a denyAll default would break every
 * unprotected route the moment a handler is wrapped.
 */
export const POLICY_EVALUATOR = "POLICY_EVALUATOR";
