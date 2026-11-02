# Review — TASK 3 (plan 20261031-048) — evidence-gate completion fix round (BUG-1..4)

- Reviewer: pw48-t3-reviewer (run_mvz2flzi_31fsj6, bash-enabled)
- Worker: pw48-t3-fixer (run_mvz21ewb_co3bky; branch subagents/run_mvz21ewb_co3bky/task_1, merged 5dc360b)
- Contract: inline in the fix-round dispatch prompt (bug-hunter findings verbatim from run_mvz1lwhg_eawmvs). NOTE: .workflows/specs/task-3.spec was persisted post-hoc from the plan block for archive completeness — the worker ran from the inline contract.

## Reviewer findings (executed itself, no borrowed evidence)

- Layer 1: lifecycle .workflows/specs/task-3.spec did not exist at review time (raw exit 1, io error) — superseded-by-named-evidence: contract was inline in the fix-round prompt (spec writes by subagents are forbidden by AGENTS.md, correctly not reconstructed). Layer 3 behavioral probes are the real check — all green.
- Guard per-spec (0.2.7 degraded): binary confirmed 0.2.7; aggregate --spec-dir degradation exercised in-suite as designed (skip-counting failures among the known 14, judged pre-existing).
- Layer 2: tdd-gate skipped (not installed).
- Layer 3 probes (all pass):
  - BUG-1: GATE_NAMES-ok; schema-valid fixture (with flow.title) → validate exit 0 with gate:"evidence" + taskId; bogus gate still rejected exit 1; flow-run:24 wires taskId → runGate("evidence") — gate executes, judges not_checked under planId flow-<slug>, report written. Merge diff confirms exactly GATE_NAMES += evidence + gate.taskId non-empty-string check. (The brief's original validate fixture omitted the required flow.title — fixture gap, not a code defect.)
  - BUG-2: evidenceGate('t1', plan-NEW, empty ledger) → fail not_checked; control same rows under plan-OLD → pass. No cross-plan leak.
  - BUG-3: recorded-fail replay exits 1 (non-zero) — not replayable-confirmed.
  - BUG-4: --kind not-replayable → exit 2 usage error, 0 rows written (fail-closed).
- Version tolerance intact: specGuardSupport present with the loud SPEC_GUARD_DEGRADED message.
- Full suite delta: known-names only — 239 tests total, 14 fail = auto-gate wiring ×9 + verdict automation ×5 (pre-existing). T3 target files: 22 pass / 0 fail — matches worker evidence 1:1.
- Doc gates: check-drift CLEAN, docs-lint CLEAN, agents-lint exit 0. Repo-level note: metric-gates complexity/duplication skipped (crapper/dryer absent) — environment, not TASK 3.

## Verdict

**ok: true**
