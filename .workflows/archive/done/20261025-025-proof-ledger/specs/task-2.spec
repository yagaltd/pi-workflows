spec: task
name: "proof-collect-unified-evidence"
tags: [proofs, evidence, journal, reviews]
max-rounds: 2
---

## Intent

`collect --plan`: merge the run journal (dispatched / done / failed per
task), review verdicts (`ok:true` presence per task file), and proof counts
into `.workflows/proofs/evidence-<plan>.json`; flag tasks with dispatches
but neither `done` nor a proof as `missing-evidence`.

## Decisions

- Judge audit and intent trail are referenced by path with row counts —
  not re-parsed per task (no per-task mapping exists for them yet).
- Reviews: `.workflows/reviews/task-<n>.md` scanned for `ok: true`.
- Exit 0 always (a report, not a gate); missing evidence is data.

## Boundaries

### Allowed Changes
- scripts/proof-ledger.mjs
- tests/proof-collect.test.ts

### Forbidden
- scripts/run-journal.mjs, scripts/judge.mjs, scripts/intent-guard.mjs
- prompts/, README.md

## Completion Criteria

Scenario: collect unifies journal reviews and proofs into per-task evidence
  Test: collect unifies journal reviews and proofs into per-task evidence
  Then evidence-<plan>.json carries per-task journal events, verdict presence and proof counts

Scenario: collect flags tasks missing proofs or verdicts
  Test: collect flags tasks missing proofs or verdicts
  Then dispatched tasks with neither done nor a proof are listed as missing-evidence
