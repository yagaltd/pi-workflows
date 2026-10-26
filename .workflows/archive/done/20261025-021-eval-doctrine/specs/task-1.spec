spec: task
name: "eval-golden-runner-and-dispatch-probe"
tags: [evals, runner, dispatcher, flip-watching, zero-dep]
max-rounds: 2
---

## Intent

One zero-dependency runner (`scripts/eval-golden.mjs`) that executes the
golden eval set, classifies outcomes per the run-twice rule, and diffs against
a baseline JSONL for flip-watching. Dispatcher cases execute through a TS
probe importing the real `resolveNext` — the runner never re-implements
dispatcher logic.

## Decisions

- Pure node for the runner (no deps, same discipline as `scripts/judge.mjs`).
- Dispatcher kind spawns `bun scripts/eval-dispatch-probe.ts <case.json>`;
  bun absent ⇒ case outcome `skipped`, reported, never silently dropped.
- Each case runs twice; stable outcomes only. Disagreement = `flaky`.
- Baseline default `.workflows/evals/baseline.jsonl`; missing baseline ⇒
  warn, write, proceed once (exit 0). Stable pass→fail ⇒ exit 1 unless the
  flip id is passed via `--accept-flip <id>`.

## Boundaries

### Allowed Changes
- scripts/eval-golden.mjs
- scripts/eval-dispatch-probe.ts
- tests/eval-golden.test.ts
- tests/fixtures/evals/

### Forbidden
- extensions/index.ts (the probe imports it; never modifies it)
- .workflows/evals/golden/ (task-2 owns the case data)
- Any live model call — deterministic replay only

## Completion Criteria

Scenario: stable cases classify pass/fail, disagreement classifies flaky
  Test: stable cases classify pass/fail, disagreement classifies flaky
  Then the runner classifies agreement and flags disagreement as flaky

Scenario: dispatcher probe executes the real resolveNext
  Test: dispatcher probe executes the real resolveNext
  Then the probe returns ok:true for task-1 wave 1

Scenario: baseline diff flags a stable pass-to-fail as a flip
  Test: baseline diff flags a stable pass-to-fail as a flip
  Then the tampered baseline exits 1 and the accepted flip exits 0
