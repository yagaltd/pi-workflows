spec: task
name: "golden-set-v1-from-shipped-evidence"
tags: [evals, golden-set, fixtures, evidence]
max-rounds: 2
---

## Intent

Eleven golden cases under `.workflows/evals/golden/*.json`, one per file,
harvested from shipped evidence (plans 013, 015–019): dispatcher selection
and blocked codes, gate verdict replays, degradation honesty, archive and
docs-gate behavior. The set is the SHIP flip-watching baseline.

## Decisions

- Case shape: `{ id, kind, tags, input?, recorded?, expected }` — one JSON
  file per case, named `<kind>-<nnn>-<slug>.json`.
- Dispatcher cases embed house-format plan text and registry maps modeled on
  the `resolveNext` fixtures in `tests/extension.test.ts`.
- Gate/degradation/archive cases replay recorded outputs — assertions run
  against the record, never live tool calls.
- The docs case computes stamp expiry from recorded fields (real logic, kept
  pure and inline).

## Boundaries

### Allowed Changes
- .workflows/evals/golden/
- .workflows/evals/baseline.jsonl (first-run artifact)
- tests/golden-set.test.ts

### Forbidden
- scripts/ (task-1 owns the runner)
- extensions/, prompts/, templates/, README.md, CHANGELOG.md
- Any case that requires a live model or network call

## Completion Criteria

Scenario: at least ten cases across all five kinds
  Test: at least ten cases across all five kinds
  Then 11 case files exist covering 4 dispatcher, 3 gate, 2 degradation, 2 archive/docs

Scenario: full suite passes with a fresh baseline
  Test: full suite passes with a fresh baseline
  Then both runner invocations exit 0 and the second reports 0 flips
