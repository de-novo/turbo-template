# Enable policy authorization

The template ships the policy contract (per ADR [0006](../adr/0006-policy-port.md)) and a wired
`PolicyModule` that provides `POLICY_EVALUATOR` defaulting to `allowAllPolicyEvaluator`. The lane is
inert until you (1) swap in a real evaluator and (2) call `evaluator.evaluate(...)` from the
handlers that gate access.

This recipe walks through both pieces. The pattern matches
[`enable-multi-tenancy`](./enable-multi-tenancy.md) — swap the provider, then teach the consumer
code.

## When this applies

You have at least one route that should be denied to certain users based on something more nuanced
than "is anyone signed in?". Common triggers:

- Role-based access control: only `admin` can delete; `viewer` is read-only.
- Ownership checks: only the note's owner can update it.
- Tenant-scoped permissions: a member of `tenant-A` cannot read `tenant-B`'s data even if they're
  authenticated.
- Compliance-driven restrictions: data-export requires a `data:export` permission that is granted
  out-of-band.

If your fork only needs "anyone with a session can do anything" (a lot of internal tools), the
existing `AuthenticatedGuard` is enough — skip this recipe.

## Step 1 — Pick an engine

| Engine                                         | Trade-off                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `createMemoryPolicyEvaluator(rules)` (shipped) | Rule list `(query) => "allow" \| "deny" \| "abstain"`. Sufficient for ~20 rules; loud failure beyond.      |
| [CASL](https://casl.js.org/)                   | Ability-based DSL with conditions; integrates well with React. Strong for resource-attribute rules.        |
| [AWS Cedar](https://www.cedarpolicy.com/)      | Declarative policy language with formal verification. Heavier; great for regulated deploys.                |
| [OPA](https://www.openpolicyagent.org/)        | Sidecar process or library. Right when policy lives outside the application (multi-team, central control). |
| Custom service                                 | Internal authz service via HTTP / gRPC. The right move when policy is owned by a separate team.            |

For most products the rule-list adapter is enough until the rule count gets uncomfortable. The
contract is the same shape across all engines — swapping `createMemoryPolicyEvaluator` for a CASL
adapter is a wiring change, not a refactor of every guard.

## Step 2 — Write the rules (or adapter)

For the rule-list case, create `apps/api/src/policy/notes-rules.ts` (or wherever fits your fork's
domain organization):

```ts
import type { PolicyRule } from "@repo/infrastructure";

export const notesRules: PolicyRule[] = [
  // Admins can do anything to notes.
  (q) => (q.subject.roles.includes("admin") ? "allow" : "abstain"),

  // The owner can write their own note.
  (q) => {
    if (q.action !== "notes:write") return "abstain";
    const ownerId = q.resource.attributes?.["ownerId"];
    return ownerId === q.subject.userId ? "allow" : "deny";
  },

  // Anyone in the same tenant can read notes.
  (q) => {
    if (q.action !== "notes:read") return "abstain";
    return q.subject.tenantId ? "allow" : "deny";
  },
];
```

For a real engine, write the adapter that implements `PolicyEvaluator` (single method:
`evaluate(query) => Effect<PolicyDecision, AppError>`). Most engines have an idiomatic helper that
takes a query and returns allow/deny — wrap it in `Effect.tryPromise` and map errors to `AppError`.

## Step 3 — Swap the `PolicyModule` provider

Edit `apps/api/src/policy/policy.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { createMemoryPolicyEvaluator } from "@repo/infrastructure";
import { notesRules } from "./notes-rules.js";
import { POLICY_EVALUATOR } from "./policy.tokens.js";

@Module({
  providers: [
    {
      provide: POLICY_EVALUATOR,
      useValue: createMemoryPolicyEvaluator(notesRules),
    },
  ],
  exports: [POLICY_EVALUATOR],
})
export class PolicyModule {}
```

For a CASL / Cedar / OPA adapter, instantiate the engine in the provider — usually `useFactory` if
the engine needs DI itself.

## Step 4 — Inject and evaluate from handlers

`apps/api/src/notes/notes.controller.ts` (sketch):

```ts
import { Inject } from "@nestjs/common";
import { type PolicyEvaluator } from "@repo/infrastructure";
import { AppError, runWorkflow } from "@repo/platform";
import { POLICY_EVALUATOR } from "../policy/policy.tokens.js";

@Controller("/notes")
export class NotesController {
  constructor(
    @Inject(NotesService) private readonly notes: NotesService,
    @Inject(POLICY_EVALUATOR) private readonly policy: PolicyEvaluator,
  ) {}

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body(updateNotePipe) body: UpdateNoteBody,
    @CurrentUser() user: SessionUser,
  ) {
    const note = this.notes.get(id);
    const decision = await runWorkflow(
      this.policy.evaluate({
        subject: { userId: user.id, roles: user.roles ?? [] },
        action: "notes:write",
        resource: { kind: "notes", id, attributes: { ownerId: note.ownerId } },
      }),
    );
    if (decision === "deny") {
      throw new AppError({ code: "FORBIDDEN", message: "Not allowed." });
    }
    return { ok: true, data: this.notes.update(id, body) };
  }
}
```

Three things matter:

- **Where to call `evaluate`** — at the controller boundary (after parsing input, before the service
  call) is the typical site. Calling from inside the service is fine when the service has multiple
  entry points and you want the gate close to the data.
- **What to throw** — `AppError({ code: "FORBIDDEN" })` for an authenticated-but-not-allowed user.
  The global `AppErrorFilter` maps `FORBIDDEN` to HTTP 403.
- **What to log** — denied decisions are forensic events. See [`enable-audit.md`](./enable-audit.md)
  for the natural pairing.

## Step 5 — Test against the memory adapter

Tests use `createMemoryPolicyEvaluator` with whatever rules the test needs:

```ts
import { allowAllPolicyEvaluator, denyAllPolicyEvaluator } from "@repo/infrastructure";

const moduleRef = await Test.createTestingModule({
  controllers: [NotesController],
  providers: [NotesService, { provide: POLICY_EVALUATOR, useValue: denyAllPolicyEvaluator }],
}).compile();

test("PUT /notes/:id returns 403 when policy denies", async () => {
  const res = await request(server).put("/notes/note-1").send({ title: "x" });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe("FORBIDDEN");
});
```

For testing specific rules, use `createMemoryPolicyEvaluator` with the ruleset you want to exercise
— same shape as production wiring.

## Step 6 — Update API docs

For each route that became policy-gated, update the `docs/api/<resource>.md` file:

- Add `FORBIDDEN` to the **Errors** table.
- Note the policy posture in the route's auth section ("requires `notes:write` permission;
  ownership-based").

The recipe at [`document-an-api-route.md`](./document-an-api-route.md) is the convention.

## Step 7 — Remove the deferred-capabilities entry

`docs/capabilities.md` carries a **Real policy engine** bullet under "Deferred capabilities". Delete
it once you've activated the lane — the deferred list should reflect what's still unwired.

## Step 8 — Verify

```bash
pnpm --filter @repo/api typecheck
pnpm --filter @repo/api test
pnpm --filter @repo/api dev

# Sign in, then attempt a denied action — should 403:
curl -X PUT --cookie 'better-auth.session_token=...' \
  https://api.fullstack-typescript-template.localhost/notes/some-id -d '{"title":"x"}'
```

Watch the access log line — it should carry `403 FORBIDDEN` in the status / level fields.

## Common pitfalls

- **Forgetting to call `evaluate`** — the `PolicyModule` is wired but no handler invokes the
  evaluator → all requests proceed. The default is allowAll on purpose; flip to
  `denyAllPolicyEvaluator` in dev for a sanity check that every gated route actually calls the
  evaluator.
- **Conflating roles and policy actions** — roles are _facts about the user_ (admin, member,
  viewer); policy actions are _the verbs on the resource_ (`notes:write`, `data:export`). Many
  engines tie the two via rule mappings; don't put role-name string equality checks in production
  handler code — it grows uncontrolled.
- **Policy decisions inside loops** — calling `evaluate` for every row of a list is rarely what you
  want. Filter by tenant + role at the query layer instead; reserve per-row policy for sensitive
  fields.
- **Skipping the audit pairing** — denied decisions are compliance-relevant. Pair this recipe with
  [`enable-audit.md`](./enable-audit.md) and record `outcome: "denied"` for every denied evaluation.

## References

- ADR [0006 — Policy port](../adr/0006-policy-port.md)
- `apps/api/src/policy/policy.module.ts` — wiring
- `packages/contracts/src/policy.ts` — `PolicyDecision`, `PolicyQuery`
- `packages/infrastructure/src/policy.ts` — `PolicyEvaluator` port + the three shipped adapters
  (allowAll / denyAll / memory rule-list)
- `packages/auth/src/permissions.ts` — `permissions` and `roles` catalog (these are _facts about the
  user_, distinct from the evaluation contract)
- [`enable-audit.md`](./enable-audit.md) — natural pairing for forensic recording of denied
  decisions
