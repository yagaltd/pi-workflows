# Review — task-1 (plan 066)

## Round 1 — 20261117 · reviewer

- Verdict: **ok: true** (no findings)
- Pins (`tests/prompt-doctrine.test.ts:649-724`): five assertions, all load-bearing.
  The "installed skills" pin uses a hardcoded `INSTALLED_SKILLS` set (line 616) with no
  filesystem reads — CI does not depend on which skills a machine has.
- `skills/init/SKILL.md:154-165`: eslint|biome detection sources → `check`; vitest|
  node --test|bun test → `verify`; worked vanilla-JS example; bun/TS and rust examples
  intact; no-linter case explicit ("`check` stays ABSENT … rather than invent one").
- `agents/reviewer.md:173-185`: modern-web-guidance first, `web-perf` for CWV
  (LCP/INP/CLS), impeccable set by intent, Rust trio now `rust-review` /
  `rust-best-practices` / `rust-port`. 11/11 cited skills resolve against the installed
  set; `unsafe-checker` gone from doctrine (legacy pin swapped 1:1, no assertion lost).
- Gates: bun test 412 pass / 0 fail · drift CLEAN · docs-lint CLEAN with the baseline
  byte-identical (no raised budget) · gen-docs --check 0 · zero added lines >80 cols.
- Observation: Layer 2 **tdd-guard now actually runs** in reviews (it was npm-linked
  during the housekeeping pass): lint clean, `verify --spec` found all 5 selectors.
  The task prompt's "not installed" note was stale.
