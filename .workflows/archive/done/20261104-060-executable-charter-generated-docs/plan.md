# Plan: executable charter, generated docs, placement manifest (20261104-060)

> Plan ID: 20261104-060
> Status: DONE — shipped as v0.14.17 on 2026-11-04; retro-archived 2026-11-17 by plan 20261117-064 (TASK 2)
> Created: 2026-11-04
> Reconstructed: 2026-11-17 — the original plan text is lost (see below)

## Reconstruction note (read first)

**The original `.workflows/plan.md` text for this plan is lost.** Plans 055–063 shared the
single live plan file; each plan overwrote it, and every one of them shipped before the SHIP
archive step was in force — so no bundle was ever written.

Nothing in this file was invented after the fact. It carries the surviving sources verbatim:

- **CHANGELOG.md** — the shipped entry `v0.14.17: executable charter, generated docs, placement manifest` (CHANGELOG.md:19)
- **.workflows/LOG.md** — every line naming this plan id (LOG.md:335, LOG.md:336)
- **.workflows/reviews/plan-060.md** — the review verdict, copied into this bundle as `reviews/plan-060.md`
  and reproduced verbatim below

Unrecoverable by construction, and therefore absent rather than guessed: the task decomposition,
the `specs/` contracts, the Execution Notes, and the per-task verdicts — all of them lived in the
overwritten plan file and its spec dir.

## CHANGELOG entry (verbatim)

```
## 2026-11-04 — v0.14.17: executable charter, generated docs, placement manifest (plan 20261104-060)

Adopting craft-anything's enforcement principle — **make the rule a type or a command** (source: ~/Documents/vibe/craft-anything/log/repo-inspection.md §9–10, owner-supplied inspection artifact):

- **Executable charter**: /init Phase 5 now generates a `[tasks]` section in mise.toml — `check` + `verify` with real per-stack commands (bun: tsc --noEmit/bun test; rust: clippy -D warnings/cargo test) — and persists the approved tree as `.workflows/tree.json`. /review Stage 1 gains "Layer 0": runs `mise run check && mise run verify` when defined (SKIP LOUDLY otherwise); flow-gates' test-quality gate appends them the same way.
- **Generated docs**: `scripts/gen-docs.mjs` regenerates the README commands table from prompts/*.md frontmatter (marker-delimited, idempotent, `--check` exit 1 on drift) — byte diff replaces model judgment.
- **Placement manifest**: `scripts/check-tree.mjs` verifies repo files against `.workflows/tree.json` (WARN tier first ship, `--strict` available); wired into docs-lint as gates 6–7.
- 15 new tests (T10 + gen-docs + tree-check). Suite 376 pass / 0 fail. Verdict reviews/plan-060.md ok:true.
```

## LOG lines (verbatim)

```
- 20261104 plan 20261104-060 APPROVED (owner "plan it"): craft-anything adoption — T1 executable charter (mise run check/verify generated at /init, wired into review Stage 1 + flow-gates), T2 generated docs (README commands table from frontmatter + --check) + tree.json placement manifest (WARN tier). Source: ~/Documents/vibe/craft-anything/log/repo-inspection.md §9-10, verified unimplemented here. Deferred: claim grammar, immutable-id lint. Principle adopted: make the rule a type or a command.
- 20261104 plan 060 CLOSED: verdict ok:true (reviews/plan-060.md, Tier A inline); SHIP v0.14.17. Executable charter (mise [tasks] at /init, wired into review+flow-gates), generated docs (gen-docs --check byte-sync), placement manifest (check-tree WARN + .pi/.seecode ignores). Source artifact credited: craft-anything log/repo-inspection.md. Deferred: claim grammar, id lint.
```

## Review verdict (verbatim)

```
# Review — plan 20261104-060 (executable charter, generated docs, placement manifest)

- Verdict: **ok: true** (orchestrator-inline, Tier A — two workers TDD RED→GREEN, file-disjoint, merged dfdd2de + 507385f)
- Workers: pw62-exec-charter (T1: 5 T10 pins + 5 flow-gates mise tests), pw62-gen-docs (T2: 2 new test suites, 10 tests)
- Verified on main post-merge: suite **376 pass / 0 fail**; drift CLEAN; docs-lint now 12 gates — #6 gen-docs byte-sync ✓, #7 check-tree CLEAN after ignore fix
- T1: /init step 7 generates `[tasks]` check+verify per detected stack + persists tree.json; step 1 cites them; /review Stage 1 "Layer 0: Executable-charter tasks (mise)" + flow-gates miseTasks/testQualityCommands (bounded spawn, loud skip, legacy shape untouched)
- T2: gen-docs.mjs (marker-delimited README commands table from prompts frontmatter, idempotent, --check exit 1 on drift); check-tree.mjs (WARN tier default, --strict available); docs-lint gates 6+7 wired (live branch only, fixture mode untouched)
- Gate-side fixes: .gitignore whitelist for tree.json (worker correctly reported, not fixed); manifest ignore += .pi, .seecode (tool state)
- Deferred per plan: claim grammar, immutable-id lint. Principle on record: make the rule a type or a command.
- Source: craft-anything repo-inspection.md §9–10 (owner-supplied artifact)
```

## Docs impact

Reconstructed at retro-archive time — the original declaration was lost with the plan text. These are the doc paths the surviving evidence shows this ship updated.

- `CHANGELOG.md` — the v0.14.17 entry above, appended at SHIP.
- `README.md` — commands table regenerated by scripts/gen-docs.mjs (per the entry).
