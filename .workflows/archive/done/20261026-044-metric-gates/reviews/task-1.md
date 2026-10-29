# Task 1 — metric gates script + profile metrics + drift section (plan 20261026-044)

## Round 1 — FINAL — ok: TRUE (reviewer pw44-t1-reviewer; zero blocking findings)
- Layer 1: 5/5 contract Test commands verbatim (skip-clean exit 0 + ≥2 skip lines; planted violation non-zero + FAIL; non-numeric metrics rejected; drift section 10 greps; mutation-tier separation proven); parse/lint clean; lifecycle 5/5 Skip = KNOWN-ACCEPTANCE.
- Layer 1b: guard zero violations; changed paths = exactly the 4 allowed files; check-drift sections 1–9 byte-stable (single section-10 hunk).
- Layer 3: bun worktree 214/11 environmental (0 new); drift CLEAN 10 sections; profile-lint + agents-lint regression guards exit 0; metrics validation read (ranges, paths, absent-block legal).
- Shipped: metric-gates.sh (crap/similarity/survived parsing documented in header; --profile override; --with-mutation tier), profile metrics block (crap_max 10, duplication_max 0.8, paths extensions+scripts), profile-lint check (f), drift section 10.
