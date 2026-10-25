spec: task
name: "contract-preflight-wiring"
tags: []
---

## Intent

Wire the contract pre-flight (backlog item 4) into the planning flow: after Phase 5 (the post-approval contract-drafting step) generates contracts, the orchestrator runs one judge pre-flight call per contract (`node scripts/judge.mjs ask --questions <preflight.json> --audit .workflows/reviews/judge-<plan>.md`), reads the typed findings table (`criterion_testable`, `boundary_complete`, `ambiguity`, `missing_scenarios`, `second_path_violation`), and feeds findings back to the spec drafter as fix rounds — before asking the human for approval. The judge is flag-only: it can never pass a contract; agent-spec lint stays the mechanical authority; the human approval gate is unchanged.

## Decisions

- The pre-flight question template ships inside `prompts/plan.md` (Phase 5 section) as a ready-to-write JSON block: five finding kinds per contract, one judge call per contract, ≤64 questions total per run.
- Fix-round loop: findings → drafter revises the contract → re-run pre-flight → remaining findings escalated to the human at the approval ask.
- `agents/execution-doctrine.md` gains the judge-placement paragraph: judges flag and route, never pass or fail; low-confidence verdicts escalate; the mechanical gates keep authority.
- Degradation text: NO-JUDGE runs print `JUDGE SKIPPED` and proceed straight to the approval ask.
- Audit location: `.workflows/reviews/judge-<plan-id>.md`, archived with the plan bundle.

## Boundaries

### Allowed Changes
- prompts/plan.md
- agents/execution-doctrine.md

### Forbidden
- Do not touch `prompts/next.md` (TASK 3 scope), `scripts/**` (TASK 1 scope), README, CHANGELOG (TASK 4 scope).
- Do not alter the approval-gate semantics (human decides; the judge only informs).
- Do not add dependencies.

## Completion Criteria

Scenario: phase 5 carries the pre-flight step
  Test: grep -q "judge.mjs ask" prompts/plan.md && grep -qi "pre-flight" prompts/plan.md
  Given prompts/plan.md after the change
  When the Phase 5 section is inspected
  Then it instructs one judge pre-flight call per contract before the approval ask
  And the audit location is named

Scenario: pre-flight question template names the five finding kinds
  Test: grep -q "criterion_testable" prompts/plan.md && grep -q "boundary_complete" prompts/plan.md && grep -q "second_path_violation" prompts/plan.md
  Given prompts/plan.md after the change
  When the question template is inspected
  Then all five finding kinds appear (criterion_testable, boundary_complete, ambiguity, missing_scenarios, second_path_violation)

Scenario: judge is flag-only in the doctrine
  Test: grep -qi "flag" agents/execution-doctrine.md && grep -qi "never pass" agents/execution-doctrine.md
  Given agents/execution-doctrine.md after the change
  When the judge-placement section is inspected
  Then the flag-and-route semantics are stated
  And the escalation rule for low-confidence verdicts is present

Scenario: degradation is stated
  Test: grep -q "JUDGE SKIPPED" prompts/plan.md
  Given prompts/plan.md after the change
  When the pre-flight step is inspected
  Then the NO-JUDGE path is documented (skip loudly, proceed to the approval ask)
