# Plan 20261117-072 — drain the last row + docs currency: baseline regen, emphasis companion, clean-files cross-ref

> Plan ID: 20261117-072
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.8 — 20261117)
> Supersedes: none (follows 20261117-071)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| 1 | stale docs-lint baseline | done(T1) | diagnosis CORRECTED: not tool drift — mise pins verified current (0.24.1/0.24.2/3.2.0, installed match); the numbers were CONTENT-stale after 068/069 improvements and the ≤ ratchet never forced them down |
| 2 | 071 adjudication: docs-policy cross-ref line | done(T1) | templates/DOCS-POLICY.md is in this plan's Allowed — the accepted-skip from 071 lands now |

Ship target: ledger EMPTY again + README/docs current with the pi-emphasis companion.

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The owner ordered: drain the pending row, then bring README/CHANGELOG/docs
current with the recent improvements and the new companion extension
(pi-emphasis — display-only status pills; installed stock, unforked; its
vocabulary maps from templates/STATUS-VOCABULARY.md). Discovery before this
plan: the three docs tools are version-pinned in mise.toml and the installed
versions match — so the stale-baseline row was misdiagnosed by the 071
worker (content-stale, not tool drift). The 071 additions-only baseline pin
must also be generalized: the standing invariant is the ratchet (measured ≤
budget), and a regen that LOWERS budgets is legitimate when documented.

## Exploration

- mise.toml pins markdownlint-cli2 0.24.1, lychee 0.24.2, harper-cli 3.2.0;
  installed match → no pinning work needed.
- docs-lint.sh --write-baseline is the regen mechanism; determinism is
  provable (two runs → identical bytes).
- test_baseline_additions_only (tests/prompt-doctrine.test.ts, 071) asserts
  additions-only vs HEAD — correct for 071, wrong as a permanent rule; to be
  replaced by a monotone-invariant pin (budgets only ever decrease; docs-lint
  CLEAN is the ratchet).
- README: last currency pass was 069 T1 (JS/TS gates, web family, ledger
  sentence). Missing since: intake doctrine (068), reply-style vocabulary +
  pi-emphasis companion (071), the empty-ledger state (069/070).
- templates/DOCS-POLICY.md exists; the clean-files cross-ref line lands here.

## Spec Map

- `.workflows/specs/task-1.spec` — docs currency + companion section + baseline regen + pin generalization

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): docs currency + baseline regen + pin generalization

- **Agent**: worker · **Wave**: 1 · **Depends On**: none
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (fix-round-072: R1 P0 git-state-coupled pin anchored to BASE_REF; R2 ok:true; merged)
- **context: budgets 4 lowered/0 raised with determinism proof; README names the companion; DOCS-POLICY cross-ref landed — ledger EMPTY**
- **Problem**: README misses the reply-style companion and recent doctrine;
  the baseline carries stale budgets; the 071 baseline pin freezes the file
  against legitimate regeneration.
- **Allowed**: README.md, docs/architecture.md, docs/canon.md,
  templates/DOCS-POLICY.md, scripts/docs-lint-baseline.json,
  tests/prompt-doctrine.test.ts
- **Verify**: bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh

## Contracts (generated after approval)

- .workflows/specs/task-1.spec

## Docs impact

- `README.md` — reply-style companion section + currency pass (current state,
  not a changelog dump)
- `templates/DOCS-POLICY.md` — clean-files cross-ref + the budgets-track-truth
  rule (lowered budgets are committed)
- `docs/architecture.md`, `docs/canon.md` — only where a natural section exists
- `CHANGELOG.md` — pi-workflows v0.15.8 entry at SHIP

## Execution Notes
