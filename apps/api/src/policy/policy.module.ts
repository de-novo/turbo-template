import { Module } from "@nestjs/common";
import { allowAllPolicyEvaluator } from "@repo/infrastructure";
import { POLICY_EVALUATOR } from "./policy.tokens.js";

/**
 * Provides the active `PolicyEvaluator` for any handler that wants to
 * gate an action. Default is `allowAllPolicyEvaluator` — the lane is
 * inert until a fork swaps the provider value (or `useFactory`) for a
 * real engine.
 *
 * No middleware is mounted here: policy is *consumer-pull* (a service
 * `@Inject`s the token and calls `evaluator.evaluate(...)`), not
 * *middleware-push* like tenant. Mixing the two would force every
 * route through a policy gate even when there is no policy-relevant
 * decision to make.
 *
 * The contract lives in `@repo/contracts/policy.ts` (per ADR 0006);
 * this module is the application-side wiring (recipe at
 * `docs/recipes/enable-policy.md`).
 */
@Module({
  providers: [
    {
      provide: POLICY_EVALUATOR,
      useValue: allowAllPolicyEvaluator,
    },
  ],
  exports: [POLICY_EVALUATOR],
})
export class PolicyModule {}
