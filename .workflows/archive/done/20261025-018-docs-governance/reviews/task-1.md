# Task 1 — docs-lint drift sections: stamps + claim-to-gate (plan 20261025-018)

## Round 1 — FINAL — ok: TRUE (reviewer pw18-t1-reviewer)
- Layer 1: lifecycle 0 failed / 5 skipped = command-form-selector KNOWN-ACCEPTANCE (verbatim execution authoritative). 4/5 Test greps verbatim exit 0; T3 spec line had an ORCHESTRATOR spec typo (missing `=` in the env assignment — unrunnable by any implementation); corrected env-prefix form exits 0. Spec line fixed post-review.
- Layer 1b: guard --spec single-file — zero violations; diff = scripts/docs-lint.sh + tests/docs-lint/** exactly; existing tool sections byte-untouched (one dispatcher if→elif for fixture mode).
- Layer 2: n/a (bash + fixtures).
- Layer 3 fixture proofs: expired stamp → finding with date; missing stamps → both keys named; claim without gate → file:line finding; fenced/inline-span exemptions hold; current+gated → exit 0. Live run: 3 findings, all docs/canon.md (:24 stamp token without date; :28/:29 gateless claims) — exactly TASK 4's targets; reported, not gated. bun 115/115; drift CLEAN.
- Note: canon.md rule 2 mentions stamp keys in prose → canon self-declares; TASK 4 must stamp with real dates or reword the tokens.
