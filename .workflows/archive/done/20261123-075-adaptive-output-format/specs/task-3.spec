spec: task
name: "format-chooser-policy"
tags: [chooser, judge, advisory]
verify: "bun test tests/format-chooser.test.ts"
max-rounds: 2
---

## Intent

Make `scripts/format-chooser.mjs` a thin advisory wrapper around the TASK 1 deterministic policy result: policy decides whether prose, table, or diagram applies; the existing single judge call keeps supplying advisory diagram-family input. Preserve the CLI contract, fail-open behavior, and advisory note so the chooser introduces no second decision path and no new judge path.

## Decisions

- Import and consume the TASK 1 pure policy result from `scripts/output-policy.mjs` (injectable in tests); do not re-implement format thresholds or the heuristic ladder inside the chooser. The existing `LADDER` prompt wording may remain as judge context, but no heuristic artifact selection remains in code.
- `artifact` is policy-derived: policy table positive yields `table`; policy diagram positive yields the policy-approved diagram form (`mermaid`/`html`); with neither positive, `artifact` is `none`. Judge answers may refine only the advisory `type` family and confidence fields.
- Keep the existing two typed judge questions (`artifact`, `type`) and the single `judge.mjs ask` call unchanged; no third question, no new boundary, no new CLI flag, no new gate, and no TypeLLM path.
- Keep `BOUNDARIES` (`closeout|plan-approval|challenge|brainstorm-graduation`), `ARTIFACTS` (`none|table|mermaid|html`), exported helpers, usage errors, and exit codes (`0` advisory, `2` usage) unchanged.
- Keep fail-open-to-`none` with a loud skip: judge `skipped` still yields `artifact: "none"`, `skipped: true`, a reason containing `prose stands`, and a `FORMAT CHOOSER SKIPPED` stderr line, even if policy would allow a visual.
- Keep advisory JSON output and its existing `note` verbatim; a judge suggestion with a stated reason is reported as advisory metadata only and can never substitute for a policy positive for `diagram`. The human agent may still overrule with a stated reason.

## Boundaries

### Allowed Changes
- .workflows/specs/task-3.spec
- scripts/format-chooser.mjs
- tests/format-chooser.test.ts

### Forbidden
- .workflows/plan.md
- scripts/output-policy.mjs (may import but not modify)
- scripts/closeout.mjs
- extensions/index.ts
- prompts/**
- docs/**
- README.md
- CHANGELOG.md
- other tests/specs

## Completion Criteria

Scenario: chooser binds artifact to the deterministic policy result
  Test: test_chooser_uses_policy_result
  Given a stubbed policy result with `prose: true`, `statusTokens: true`, table positive, and no diagram, plus an `ask` stub that answers `artifact: "none"`
  When `choose({ boundary: "closeout", content, policy: stubPolicy })` resolves
  Then `artifact` is the policy-approved `table` form, not the judge's `none`
  And the judge call still receives exactly the two typed question ids `artifact` and `type`

Scenario: judge-only diagram is rejected (negative)
  Test: test_chooser_rejects_judge_only_diagram
  Given a policy result with no diagram and an `ask` stub answering artifact `html` with confidence `0.99` and type `loop`
  When `choose` resolves
  Then `artifact` is `none` (or the policy-approved table form when table is positive) and no diagram form is returned
  And the judge suggestion is retained only as advisory metadata and never flips the policy's diagram negative

Scenario: skipped judge still fails open loudly
  Test: test_chooser_fail_open_without_judge
  Given an `ask` stub resolving with `{ skipped: true }` and a policy result that would approve a diagram
  When `main(["choose", "--for", "plan-approval", "--content-file", <temp file>])` runs with stderr captured
  Then the emitted JSON has `artifact: "none"`, `skipped: true`, and a reason containing `prose stands`
  And stderr contains `FORMAT CHOOSER SKIPPED` and the exit code is `0`

Scenario: advisory JSON and stated-reason overrule stay intact
  Test: test_chooser_preserves_advisory_note
  Given a policy result approving a diagram and an `ask` stub returning typed answers with a stated reason
  When `main(["choose", "--for", "closeout", "--content-file", <temp file>])` runs
  Then stdout JSON keeps the existing `note` containing `advisory`, `stated reason`, and `generated views, never gates`, with the policy-derived artifact and judge advisory type/confidence/reason fields
  And `BOUNDARIES` is unchanged and no third question id is sent to the judge
