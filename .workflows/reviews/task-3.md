# Task 3 — scripts/docs-lint.sh (plan 20261024-014)

## Round 1 — FINAL — ok: TRUE (reviewer pw14-t3-reviewer)
- Layer 1: lifecycle limited (env), accepted (backlog item 11 = toolchain defect batch: agent-spec fork Node-verifier port, guard per-spec scoping, tdd-guard lint parser fix, canonical --tests <dir> verify) — 0 failed, 3 skipped.
- Layer 1b: per-task-scoped guard — zero boundary violations; accepted sub-signal only. Changed paths = {scripts/docs-lint.sh} ⊆ allowed.
- Layer 2: n/a (bash-script task).
- Layer 3: docs-lint exit 0 (graceful-skip, 3 tools absent); doc_paths greps pass; DOCS_LINT_HARPER_ADVISORY knob present; drift CLEAN; bun 64/64; executable bit; runs from /tmp.
- Failure-path proof: PATH-shimmed fake tools — markdownlint findings → exit 1; Harper strict → exit 1; Harper + advisory → exit 0.
- Noted: docs/ path tolerated-when-missing; Harper strict-first-install will fire on project vocabulary (escape hatch = advisory knob).
