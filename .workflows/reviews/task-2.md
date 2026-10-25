# Task 2 — guard --spec single-spec mode (plan 20261025-016)

## Round 1 — FINAL — ok: TRUE (reviewer pw16-t2-reviewer)
- Layer 1: 4/4 contract #[test] names pass (tests/contract_guard_workflow.rs:125/165/208/255, CARGO_BIN_EXE CLI-driven on a Node fixture exercising the T1 NodeTestVerifier): sibling-with-failing-selector ignored; named-contract-only verification; boundary violation → exit 1 + FAILED + contract named; --spec + --spec-dir = clap conflict exit 2.
- Layer 1b: diff = {src/main.rs, tests/contract_guard_workflow.rs} ⊆ allowed.
- Layer 3: cargo 877 passed / 3 failed — the 3 atlas_eval failures PROVEN pre-existing (src/atlas_eval.rs byte-identical to base; deterministic fixture-assertion panics off the guard path). Pristine-binary methodology: git archive base + dedicated CARGO_TARGET_DIR (first attempt silently reused the cached new binary — detected via size + zero `long = "spec"` in base main.rs); --spec-dir output byte-identical old vs new; pristine rejects --spec (flag proven new).

## Merge record (appended at archive prep)
- Merged: `git merge --no-ff subagents/run_mvns49s3_7sitxr/worker-2` → fork main (agent-spec v1.5.0). Post-merge bounded re-run: 843 passed / 0 failed (--skip atlas_, see task-1.md).
