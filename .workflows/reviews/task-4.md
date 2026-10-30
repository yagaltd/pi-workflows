# Review — TASK 4 (plan 20261030-046) — doc-gate guidance

- Reviewer: pw46-t4-reviewer-2 (run_mvv95wsz_pgmkil/task_2, bash-enabled re-run; first attempt run_mvv8w624_8b1x7m/task_2 VOIDed — orchestrator dispatch bug, tools override missing from the tasks-array entry)
- Worker: pw46-t4-worker (branch subagents/run_mvv8plig_bjcs3p/task_3 @ e8ba123)
- Contract: .workflows/specs/task-4.spec

## Reviewer findings (executed itself, no borrowed evidence)

- Layer 1 (agent-spec contract verification): lifecycle 0 failed / 5 skipped — skip-only per the documented structural note (no tester wave; shell selectors). No FAILED scenario. Selector self-runs against the main checkout: S1 `just docs` in flows SKILL PASS; S2 `justfile` in AGENTS.md PASS; S3 agents-lint exit 0 PASS; S4 check-drift CLEAN PASS; S5 negative-budget agents-lint exit 0 PASS. AGENTS.md at 29 lines (≤60 budget). Spec lint 96% quality. Guard raw exit 1 fully attributed to sibling transports (T2 ci.yml, T3 install-git-hooks.sh — other tasks' review state) + a guard tool artifact (absolute-vs-relative boundary paths); TASK-4-scoped boundary judgment: respected — `git diff --stat master...task_3` = exactly `AGENTS.md | 1 +` + `skills/flows/SKILL.md | 9 ++-`.
- Layer 2 (tdd-gate): not installed — skipped loudly; docs-only diff, no test files changed.
- Layer 3 (project toolchain): verify line verbatim PASS (agents-lint && check-drift && greps). Contracts: pre-existing CONTRACTS:1:1 prose-preamble failure — repo-level note, out of scope, CONTRACTS untouched by branch.

## Verdict

**ok: true**

Non-blocking notes for the human gate (SHIP):
1. Guard tool artifact: boundary scenario renders absolute paths against relative boundaries — flags even in-scope files "not covered" when run over a multi-spec dir mid-plan. Candidate guard fix task (repo-level, outside plan 046).
2. CONTRACTS:1:1 pre-existing cc-check format failure (already logged).
