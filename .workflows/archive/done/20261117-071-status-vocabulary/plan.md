# Plan 20261117-071 — reply-style vocabulary: status pills for reports, single source, files stay clean

> Plan ID: 20261117-071
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.7 — 20261117)
> Supersedes: none (follows 20261117-070)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| — | none — ledger EMPTY at plan time (closed by 069+070) | done(n/a) | this plan adds surface, not debt; any new findings enter via the intake triage rule |

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The owner installed the pi-emphasis extension (display-only status pills;
vocabulary-driven; guidance auto-injected in TUI). Decision: use it stock, no
fork — its vocabulary already covers every pi-workflows status. What
pi-workflows adds is the DOMAIN MAPPING and the hygiene rule: a single-source
vocabulary table mapping our tokens (done/closed/deferred/queued, gate
verdicts, risk levels) to pill words, the requirement that ship reports open
with a one-line scoreboard, and the files-stay-clean rule (pills and glyph
decorations live in chat replies only — repo files stay clean markdown). The
extension's own guidance teaches pill writing globally; pi-workflows must not
duplicate it, only map domain tokens and pin the hygiene rule.

## Exploration

- pi-emphasis `VOCABULARY` (index.ts:50-57): 7 tones; success covers
  Done/Passed/Shipped/Merged/Verified; warning covers Decision/Pending/
  Skipped/At risk; plus detail syntax `[[Passed 12/12]]` and action lead-ins.
- `agents/registry.md` already mandates the ship report END with the
  follow-up table — the scoreboard-opening rule lands beside it.
- `scripts/docs-lint-baseline.json` is per-file ratcheted (069 cut it to the
  floor): a NEW template file requires a baseline ADDITION — pre-authorized,
  existing numbers must stay byte-identical.
- `scripts/check-tree.mjs` + `.workflows/tree.json` + `docs/architecture.md`
  may govern a new templates/ file — worker checks and updates whichever the
  checker demands.

## Spec Map

- `.workflows/specs/task-1.spec` — status vocabulary: single source, mapping, hygiene rules

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): status vocabulary + scoreboard + clean-files rule

- **Agent**: worker · **Wave**: 1 · **Depends On**: none
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (reviewer ok:true first pass; merged)
- **context: vocabulary live — scoreboard + files-stay-clean pinned; docs-policy cross-ref adjudicated as accepted-skip**
- **Problem**: report statuses are scattered (✅/⬜, ok:true, P0–P3,
  disposition tokens) with no single source and no scannable summary layer.
- **Allowed**: templates/STATUS-VOCABULARY.md, agents/registry.md,
  tests/prompt-doctrine.test.ts, scripts/docs-lint-baseline.json,
  docs/architecture.md, .workflows/tree.json
- **Verify**: bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh

## Contracts (generated after approval)

- .workflows/specs/task-1.spec

## Docs impact

- `templates/STATUS-VOCABULARY.md` — the single-source mapping (new)
- `agents/registry.md` — scoreboard-opening rule beside the ship-table rule
- `CHANGELOG.md` — pi-workflows v0.15.7 entry at SHIP

## Execution Notes
