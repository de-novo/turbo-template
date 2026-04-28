import type { PolicyQuery } from "@repo/contracts";
import { Effect } from "effect";
import { expect, test } from "vitest";
import {
  allowAllPolicyEvaluator,
  createMemoryPolicyEvaluator,
  denyAllPolicyEvaluator,
} from "./policy.js";

const sampleQuery: PolicyQuery = {
  subject: { userId: "u-1", roles: ["member"] },
  action: "notes:read",
  resource: { kind: "notes", id: "note-1" },
};

test("allowAllPolicyEvaluator returns allow", async () => {
  const result = await Effect.runPromise(allowAllPolicyEvaluator.evaluate(sampleQuery));
  expect(result).toBe("allow");
});

test("denyAllPolicyEvaluator returns deny", async () => {
  const result = await Effect.runPromise(denyAllPolicyEvaluator.evaluate(sampleQuery));
  expect(result).toBe("deny");
});

test("memory evaluator runs rules in order, first non-abstain wins", async () => {
  const evaluator = createMemoryPolicyEvaluator([
    () => "abstain",
    (q) => (q.action === "notes:read" ? "allow" : "abstain"),
    () => "deny",
  ]);

  const result = await Effect.runPromise(evaluator.evaluate(sampleQuery));
  expect(result).toBe("allow");
});

test("memory evaluator falls through to fail-closed deny when no rule decides", async () => {
  const evaluator = createMemoryPolicyEvaluator([() => "abstain", () => "abstain"]);
  const result = await Effect.runPromise(evaluator.evaluate(sampleQuery));
  expect(result).toBe("deny");
});

test("memory evaluator denies an unrelated action even when an allow rule exists", async () => {
  const evaluator = createMemoryPolicyEvaluator([
    (q) => (q.action === "notes:read" ? "allow" : "abstain"),
  ]);

  const result = await Effect.runPromise(
    evaluator.evaluate({ ...sampleQuery, action: "notes:write" }),
  );
  expect(result).toBe("deny");
});

test("memory evaluator can express ABAC ownership: owner allows, others deny", async () => {
  const evaluator = createMemoryPolicyEvaluator([
    (q) => {
      const ownerId = q.resource.attributes?.["ownerId"];
      if (q.action === "notes:write" && ownerId === q.subject.userId) {
        return "allow";
      }
      if (q.action === "notes:write") {
        return "deny";
      }
      return "abstain";
    },
  ]);

  const owner = await Effect.runPromise(
    evaluator.evaluate({
      subject: { userId: "u-1", roles: [] },
      action: "notes:write",
      resource: { kind: "notes", id: "note-1", attributes: { ownerId: "u-1" } },
    }),
  );
  expect(owner).toBe("allow");

  const stranger = await Effect.runPromise(
    evaluator.evaluate({
      subject: { userId: "u-2", roles: [] },
      action: "notes:write",
      resource: { kind: "notes", id: "note-1", attributes: { ownerId: "u-1" } },
    }),
  );
  expect(stranger).toBe("deny");
});
