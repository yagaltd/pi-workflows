# Task 1 — scaffold generator + adr kind + profile-lint kind checks (plan 20261026-043)

## Round 1 — FINAL — ok: TRUE (reviewer pw43-t1-reviewer; zero blocking findings)
- Layer 1: 5/5 contract Test commands verbatim (adr creation DEC-006 render + cleanup; unknown-kind lists known; overwrite refuses name-scoped; invalid name; profile-lint green + broken-kind probe bites 2 FAILs); parse/lint clean; lifecycle 5/5 Skip = KNOWN-ACCEPTANCE.
- Layer 1b: guard zero violations; changed paths = exactly the 4 allowed files; decisions dir restored post-probe.
- Layer 3: bun worktree 214/11 all environmental (zero refs to changed files); drift CLEAN 9 sections; agents-lint regression guard exit 0.
- Shipped mechanics: scaffold.sh (kind lookup, sanitize, {{next:N}} prefix-scan + max+1, name-scoped overwrite refusal at any sequence, render, print path; no hooks/git ops); profile-lint kind checks (template on_disk + {{name}} in target), bite-proven.
