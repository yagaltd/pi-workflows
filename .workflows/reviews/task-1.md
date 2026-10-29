# Task 1 — agents template + lint + repo self-migration (plan 20261026-040)

## Round 1 — FINAL — ok: TRUE (reviewer pw40-t1-reviewer; all layers green, no findings)
- Layer 1: 5/5 contract Test commands verbatim green (dead-pointer negative exits non-zero as required); lifecycle 5/5 Skip = KNOWN-ACCEPTANCE; parse/lint clean.
- Layer 1b: guard zero violations; changed paths = exactly {templates/AGENTS.md (M, 29L), scripts/agents-lint.sh (A, +x), AGENTS.md (M, 28L)}.
- Layer 3: bun A/B-proven (worktree 214/11 = HEAD-state identical environmental set; main 225/0); drift CLEAN; greeting verbatim; lint negative suite (placeholder/AGENTS.md-target/plan-ID) each non-zero; template-mode placeholder exemption exit 0.
- Shipped mechanics: agents-lint rules a-f; pointer resolution via file-dir .git walk-up (works on /tmp copies); <placeholder> auto-exempt only under templates/*; AGENTS.md never backtick-points .workflows/** (gitignored → lint self-fail guard).
