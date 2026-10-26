spec: task
name: "lessons-ledger-distill-set-list"
tags: [lessons, ledger, provenance, archive]
max-rounds: 2
---

## Intent

`scripts/lessons.mjs`: distill an archived plan bundle into provenance-flagged
lessons (`.workflows/lessons/lessons.jsonl`), deliberate status transitions
with recorded reasons, and filtered listing.

## Decisions

- `distill --plan-file <plan.md> --reviews-dir <dir> [--proofs <file>]
  --ledger <file>`: one lesson per task — status `valid` (✅ + ok:true),
  `failed` (❌), else `speculative`; provenance `verified` when the task has
  a proof record in proofs.jsonl, else `from_untrusted`. Idempotent per
  (planId, taskId): re-distill of the same bundle appends nothing.
- `set --id --status <valid|superseded|failed|speculative> --reason "<why>"`
  appends a transition record; refused (exit 2) without --reason.
- `list [--status s] [--tag t] [--text q]` prints current-status lessons.
- `main(argv)` exported for tests; all paths explicit flags (no cwd magic).

## Boundaries

### Allowed Changes
- scripts/lessons.mjs
- tests/lessons.test.ts

### Forbidden
- scripts/proof-ledger.mjs, scripts/run-journal.mjs, scripts/judge.mjs (read-only inputs)
- prompts/, README.md, extensions/index.ts

## Completion Criteria

Scenario: distill turns archived verdicts and proofs into provenance-flagged lessons
  Test: distill turns archived verdicts and proofs into provenance-flagged lessons
  Then a done task with a proof distills valid+verified, a failed task distills failed, and no-proof tasks are from_untrusted

Scenario: status transitions require a recorded reason and keep history
  Test: status transitions require a recorded reason and keep history
  Then set without --reason exits 2, and with --reason appends a transition while the original lesson stays in the file

Scenario: lessons list and query filter by status tag and text
  Test: lessons list and query filter by status tag and text
  Then list filters by current status, tag substring and text substring
