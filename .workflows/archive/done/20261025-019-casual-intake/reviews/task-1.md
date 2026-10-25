# Task 1 — casual intake emitter + format discovery (plan 20261025-019)

## Round 1 — ok: false (1 P1 = SPEC DEFECT, worker escalation correct)
- P1: Scenario 1's verbatim Test: `requirements import --from <fixture> --check` is UNSATISFIABLE under fork 1.5.0 — `--check` is a drift gate (parse → render → byte-compare vs the --out corpus), NOT parse-only validation; missing rendered artifacts = drift = exit 1. Worker escalated per the stop-rule (0/3 iterations, structural) and implemented the satisfiable form: `--check --out tests/intake/rendered` with checked-in artifacts → exit 0, byte-exact round-trip.
- Format discovered (recorded in tests/intake/README.md): parser = fork src/spec_knowledge/intake.rs::parse_requirement_blocks (upstream clone has NO marked-block parser — fork is sole authority). Block: `<!-- agent-spec:requirement id="REQ-X" title="T" tags source -->body<!-- /agent-spec:requirement -->`; id/title required; prose outside markers ignored.
- All other layers PASS: idea/brainstorm intake steps + thin-trigger (idea.md 11 ≤ 20), guard --spec zero violations, diff ⊆ allowed 6 paths, import-safety audit clean (zero --check-less invocations), bun 115/115, drift CLEAN.

## ORCHESTRATOR DECISION (2026-10-25)
- Scenario 1 Test: amended to `agent-spec requirements import --from tests/intake/sample-intake.md --check --out tests/intake/rendered` — mirrors the fork's own noteapp-demo pattern and plan-019 D4's --out pattern. Semantics recorded: fork 1.5.0 --check = drift gate; parse-only validation does not exist on this surface.
- Prompts teach the truthful semantics (worker): parse errors = fix blocks; `drifted` lines = expected pre-approval state naming the artifact approval would create.

## Round 2 — pending reviewer

## Round 2 — FINAL — ok: TRUE (reviewer pw19-t1-reviewer-r2, on merged master)
- Layer 1: lifecycle 4/4 Skip (known-acceptance), 0 FAIL; parse/lint clean; amendment verified in spec; the 4 contract Test: commands verbatim exit 0 (amended (a): --check --out tests/intake/rendered = byte-exact round-trip proven).
- Layer 1b: guard --spec single-file — zero violations; T1 merge diff = exactly 6 files ⊆ 3 allowed paths.
- Layer 3: bun 115/115; drift CLEAN; frontmatter valid; import-safety audit clean (all executable import invocations carry --check; the --check-less README mention is the documented human-approval-gated step).
- FORMAT RECORD (authoritative, from tests/intake/README.md): parser = fork src/spec_knowledge/intake.rs::parse_requirement_blocks (sole authority — upstream clone has no marked-block parser). Block: `<!-- agent-spec:requirement id title tags source -->body<!-- /agent-spec:requirement -->`; id/title required; prose outside markers ignored. Semantics: fork 1.5.0 --check = drift gate (parse→render→byte-compare vs --out corpus) — NOT parse-only; "drifted" = expected pre-approval state.
