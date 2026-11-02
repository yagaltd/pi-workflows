# Review — fix round (plan 20261102-049) — BUG-1 values-never-extract sanitize

- Reviewer: pw49-fixrev (run_mvz6fzed_yvuivv, bash-enabled)
- Worker: pw49-fixround (run_mvz65lu1_0kebrf; branch subagents/run_mvz65lu1_0kebrf/task_1 — 3 files: scripts/pii-scan.mjs +56, skills/review/SKILL.md 4±, tests/pii-scan.test.ts +101)
- Origin finding: whole-plan review BUG-1 MEDIUM (values-never-extract over-broad — CSV header cells, MD heading text, JSON/YAML/TOML key names reached the judge verbatim; bug-hunter probe-executed)

## Reviewer findings (executed itself, no borrowed evidence)

- Layer 1: lifecycle skip-only 6/6 (tdd-guard absence — known); compensating selector self-runs: 8 selectors → 12 pass / 0 fail; full pii-scan file 10 pass / 0 fail. Boundary: fix diff = exactly 3 files ✓.
- Layer 2: tdd-gate skipped (not installed). RED proven mechanically: pre-fix script (abb135fd — zero sanitizeName refs; fix tip 3cfa569 — 8 refs) built state/digest/questions ALL containing name-position sentinel SECRETVALUE42 → new test fails pre-fix; GREEN 10/10. No-weakening: tests diff deletions = 6 reworded header-comment lines only, zero test/assertion deletions ✓.
- Layer 3 core: four-position leak probe grep -c SECRETVALUE42 = 0 ✓ (CSV header-cell + data-row, MD heading, JSON key-name positions). sanitizeName: deterministic, ≤24 bound, idempotent, semantics survive (`email` unchanged), literals die (`[redacted:13]`); redact-before-truncate discriminator verified (`aaa…-SECRETVALUE42` → no `SECRET` fragment survives). Minor non-blocking: the redaction marker can be cut at the 24-char boundary (cosmetic; the "no partial runs survive" contract holds). SKILL.md:109-111 precision-reworded (sanitizer named) ✓; check-drift CLEAN ✓.
- Full-suite delta: 235/14 with fix vs 222/14 clean HEAD — failure sets byte-identical (auto-gate ×9 + verdict automation ×5, agent-spec 0.2.7 family) — zero new names ✓. cc-check absent (accepted-skip).

## Verdict

**ok: true**
