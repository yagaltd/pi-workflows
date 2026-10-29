# Task 1 — profile-lint + repo profile + drift section (plan 20261026-041)

## Round 1 — FINAL — ok: TRUE (reviewer pw41-t1-reviewer; all layers green, no findings)
- Layer 1: 5/5 contract Test commands verbatim (3 negatives each non-zero with FAIL lines); parse/lint clean; lifecycle 5/5 Skip = KNOWN-ACCEPTANCE.
- Layer 1b: git-diff cross-check = exactly the 4 allowed paths; zero violations. TOOLING NOTE on record: agent-spec guard's dotfile matcher false-negatives on `.gitignore` (root dotfile) — known backlogged guard-scoping defect batch (LOG:111); deterministic git-diff cross-check authoritative.
- Layer 3: bun 225/0 main; drift CLEAN 9 sections; lint rule coverage complete (schema/existence/command -v/gates/stamps + .git walk-up AND linked-worktree fallback via git-common-dir parent — gitignored pointer targets resolve where they exist); .gitignore negation functionally proven.
- Shipped: .workflows/profile.json (commands bun test/docs-lint; 5 pointers; 6 tree domains; 3 gates; scaffolds empty; meta init --adopt 2026-10-29→2026-11-28); section 9 with FAIL accounting.
