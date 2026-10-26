spec: task
name: "proof-ledger-record-show-verify"
tags: [proofs, ledger, hash, zero-dep]
max-rounds: 2
---

## Intent

`scripts/proof-ledger.mjs`: per-task proof records — the task's Verify
command, its exit code, and a sha256 of the verifier output — appended to
`.workflows/proofs/proofs.jsonl`. `verify` re-runs the last recorded command
and flags drift.

## Decisions

- `record --plan --task --verify "<cmd>" [--spec <path>]`: runs the command
  (bash -c), appends `{ts, planId, taskId, command, exit, outputHash,
  specHash?}`, exits with the verifier's exit code (after writing).
- `outputHash` = sha256(stdout + stderr); `specHash` = sha256 of the spec
  bytes when `--spec` given.
- `show --plan [--task]` prints records. `verify --plan --task` re-runs the
  last command: exit + hash match ⇒ 0, mismatch ⇒ 1 with both hashes,
  no record ⇒ 1.
- `main(argv)` exported for tests.

## Boundaries

### Allowed Changes
- scripts/proof-ledger.mjs
- tests/proof-ledger.test.ts

### Forbidden
- scripts/run-journal.mjs, scripts/judge.mjs, scripts/intent-guard.mjs
- prompts/, README.md, extensions/index.ts

## Completion Criteria

Scenario: proof record runs the verifier and records exit with output hash
  Test: proof record runs the verifier and records exit with output hash
  Then a passing and a failing verifier both append records with correct exit and sha256 output hashes

Scenario: proof verify re-runs the recorded command and flags drift on hash change
  Test: proof verify re-runs the recorded command and flags drift on hash change
  Then same-output re-run exits 0 and a changed-output re-run exits 1 printing both hashes

Scenario: proof show reads the ledger by plan and task
  Test: proof show reads the ledger by plan and task
  Then show filters records by plan and by task without re-running anything
