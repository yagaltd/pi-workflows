spec: task
name: "verdict-automation"
tags: []
---

## Intent

Move the post-verdict records out of the prompts into the extension: when a FINAL verdict lands (a write to `.workflows/reviews/<task-id>.md` whose content carries the FINAL `ok: true|false` block), the extension runs `proof-ledger record` and `run-journal record done|failed` automatically (deduped per task:round). When the wave's LAST pending task gains its FINAL verdict, the extension runs the wave-settle compaction (`scripts/judge.mjs ask`) and injects the fixed-size verdict table via the existing before_agent_start injection; `JUDGE SKIPPED` ⇒ inject the one-sentence per-child fallback. This removes the proof/journal/compaction steps from `prompts/next.md` (the prompt rewrite is TASK 3).

## Decisions

- Trigger: the existing edit/write interception gains a verdict branch — path matches `.workflows/reviews/*.md` AND the written content carries a FINAL verdict marker (the `## Verdict` block with `**ok: true**` / `**ok: false**`).
- Records: `node scripts/proof-ledger.mjs record --plan <plan-id> --task <task-id> --verify "<task Verify command>" --spec <spec path>` and `node scripts/run-journal.mjs record --plan <plan-id> --task <task-id> --event done|failed` (with `--cost` when available). Plan ID parsed from the live plan; task id from the file name.
- Dedupe: a map keyed `<task-id>:<round-or-final>` — a second identical FINAL write is a no-op.
- Compaction: fired only when the wave's LAST pending task settles (the live plan's pending set for that wave empties); question set built from the settled children (outcome, blockers, deviations, cost bucket); 64-cap honored with split; `JUDGE SKIPPED` ⇒ inject the one-sentence per-child fallback.
- Degradation: `scripts/proof-ledger.mjs` / `run-journal.mjs` / `judge.mjs` absent ⇒ skip silently (documented degradation — the same class as the auto-gate advisory; the hooks are optional tooling).

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/extension.test.ts

### Forbidden
- Do not touch `prompts/**` (TASK 3 scope), `scripts/**` (consumed, not modified), `agents/**`, README, CHANGELOG (TASK 4 scope).
- Do not change the auto-gate or @role handlers — a separate registration branch.
- Do not add dependencies.

## Completion Criteria

Scenario: records proof and journal on a final ok true verdict
  Test: records proof and journal on a final ok true verdict
  Given a fixture plan with one task and stub record scripts on PATH
  When a write lands a FINAL ok: true verdict for the task
  Then proof-ledger record and run-journal record done execute once each
  And the invocation arguments carry the plan id, task id, and Verify command

Scenario: records failed outcome on a final ok false verdict
  Test: records failed outcome on a final ok false verdict
  Given a FINAL ok: false verdict write
  When the automation runs
  Then run-journal records failed
  And proof-ledger still records its proof (exit code is data)

Scenario: dedupes per task and round
  Test: dedupes per task and round
  Given the same FINAL verdict written twice
  When the second write lands
  Then no second record executes

Scenario: degrades silently when the record scripts are absent
  Test: degrades silently when the record scripts are absent
  Given neither record script on PATH
  When a FINAL verdict write lands
  Then the write proceeds with no error and no advisory spam

Scenario: injects the compaction table on the wave's last verdict
  Test: injects the compaction table on the last verdict of a wave
  Given a two-task wave where the first task is already settled
  When the second (last) task's FINAL verdict lands
  Then the judge runs once with the settled-children question set
  And the fixed-size verdict table is injected

Scenario: injects the fallback note when the judge skips
  Test: injects the fallback note when the judge skips
  Given the judge absent (JUDGE SKIPPED)
  When the wave's last verdict lands
  Then the one-sentence per-child fallback is injected
