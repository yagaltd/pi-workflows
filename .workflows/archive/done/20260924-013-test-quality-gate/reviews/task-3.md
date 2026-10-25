# Task 3 — skills/* flow wiring (plan 20260924-013)

## Round 1 — FINAL — ok: TRUE (reviewer pw13-t3-reviewer)
- Layer 1: 6/6 contract Test greps exit 0 (add-feature tester + `tdd-gate coverage` + zero tdd-guard; fix tdd-guard brownfield + no tdd-gate; refactor no tdd-gate; plan `tdd:` flag + tester; plan `Test:` selector). Parse exit 0; lint Quality 100%, 0 ERROR (5 WARN decision-coverage + 1 INFO rule-grouping non-gating).
- Layer 1b: per-task-scoped guard (/tmp/t3-specs) — sub-signal "0 failed, 6 skipped" = accepted env limitation (backlog item 11); changed paths = {skills/add-feature/SKILL.md, skills/plan/SKILL.md} ⊆ allowed 4; fix/refactor intentionally untouched (greps already satisfied).
- Layer 2: n/a (docs-only contract).
- Layer 3: bun test 64/64; check-drift CLEAN; cc-check repo-wide baseline-identical (known .md-rejection + CONTRACTS:1:1 pre-existing).
