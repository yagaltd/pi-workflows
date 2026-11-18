# Fix round + review record — plan 068

## Task 2 (agent-spec frozen-spec carve-out) — reviewer as68-t2 · ok: true

- All 6 orchestrator steps green: cargo 306/0, clippy/fmt clean, enumeration
  re-run per-file matches the marked set exactly (16 findings / 11 files,
  zero over/under-marking), src/** byte-identical, docs + CHANGELOG truthful,
  lifecycle 4/4 with the marker selector executed.
- Worker corrected plan-067's durable record: the "11 findings" was truncated
  output (combined lint aborts at first parse error — specs/roadmap/README.md
  has no frontmatter). True set: 16 findings / 11 files.
- New queue row from the worker: lint multi-file abort (P2 — per-file results
  should continue past parse failures and name every bad file); already
  poisoned one durable count.
- Loud skips recorded: tdd-guard verify reported all selectors unbound on a
  Rust repo while cargo executes them — third confirmation of the deferred
  tdd-guard-verify row. cc-check unusable under mise (env), tdd-guard lint
  empty-scan on Rust tests.

## Task 1 (pi-workflows intake doctrine) — reviewer pw68-t1 · ok: false → resolved

- R1 finding [P3], the doctrine's first live enforcement: the worker batched
  two IN-SCOPE cosmetics into its own follow-up table ("Bare-id cosmetics
  batch": bare plan ids at templates/FOLLOW-UP-TABLE.md:5; mid-sentence wrap
  at skills/plan/SKILL.md:521-523) citing a "scope lock" that does not exist
  at file-level Allowed. Both files are in the task's Allowed list.
- Remedy applied (orchestrator hygiene, reviewer-prescribed): ids backticked,
  wrap joined, the over-80 line the backticks created rewrapped; gates green
  (bun 425/0 on the branch, then 434/0 on merged master; drift CLEAN;
  docs-lint CLEAN; baseline byte-identical sha256 match). Amended tip 1219712,
  merged.
- The queue row is dropped per the reviewer's fix direction; this file is the
  deletion record the triage rule requires.
