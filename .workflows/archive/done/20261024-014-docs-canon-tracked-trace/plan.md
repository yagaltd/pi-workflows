# Plan: docs canon + tracked trace (014)

> Plan ID: 20261024-014
> Status: SHIPPED 2026-10-24 — final gate review-final-r2 ok:true
> Created: 2026-10-24
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. One Tier B task (T3); rest Tier A orchestrator-inline.

## Context

Backlog item 1 (`.workflows/proposals/20261024-session-backlog.md`): `.gitignore:5` ignores the whole `.workflows/` tree, so the plan's own decision evidence — LOG.md (100+ entries), CONTEXT.md, reviews/ (9 verdict chains), archive/ (13 closed plans), proposals/ — is untracked: no git history, no CI visibility, unrecoverable from a bad clone. The charter declares these durable ("durable knowledge outlives every plan"); git disagrees. This plan adopts lore-style documentation engineering (origin: EpicGames/lore doc-standards canon, adapted by agent-spec): typed docs + a canon file + docs-lint tooling, and splits `.workflows/` into durable (tracked) and ephemeral (untracked). Fold-in: `templates/CONTRACT-FORMAT.md` lacks the front-matter block — the root cause of all 3 round-1 contract defects in plan 013 (T1, T4, and the 014 drafter's own first attempt).

Out of scope: item 11 (backlog entry 11 = the toolchain-defect batch: agent-spec fork Node-verifier port, guard per-spec scoping, tdd-guard lint parser fix, canonical `--tests <dir>` verify), doc-drift gate (item 4) and CI wiring stay queued.

## Decisions

- **D1 — Tracked/ephemeral split.** `.gitignore`: `.workflows/` becomes `.workflows/*` plus negations for the durable set — `!.workflows/LOG.md`, `!.workflows/CONTEXT.md`, `!.workflows/reviews/`, `!.workflows/archive/`, `!.workflows/proposals/`. Ephemeral stays untracked: `plan.md` (live state), `specs/` (in-flight), `scout/`, `spikes/`. Gitignore semantics require the parent-dir form (`.workflows/*`, not `.workflows/`) — negations under a fully excluded directory never match.
- **D2 — Canon.** `docs/canon.md`: doc types mapped to Diátaxis — README (reference entry), AGENTS.md (charter), `skills/`+`prompts/` (procedures), `docs/**` (development guides: how-to/reference/explanation), `.workflows/archive/` (decision records). Rules: one purpose per doc; generated docs carry `generated_by`/`generated_at`/`stale_after` stamps; adopted ideas use our names with origin notes; every behavioral claim names its gate.
- **D3 — docs-lint.** `scripts/docs-lint.sh`: wrapper over `README.md AGENTS.md docs/ agents/ skills/ prompts/ templates/` — markdownlint-cli2 + lychee gate when installed, Harper advisory by default (`DOCS_LINT_HARPER_ADVISORY=1`), graceful skip with warnings when tools are absent (mirrors agent-spec's script). Exit non-zero only on tool findings. Not wired into pre-commit — hook wiring belongs to the doc-drift gate (item 4).
- **D4 — Contract template fix.** `templates/CONTRACT-FORMAT.md` gains the exact front-matter block (`spec: task` / `name:` / `tags: []` / `---` terminator, no H1) at the top of its template, plus a warning: a contract without the terminator fails `agent-spec parse` ("missing front-matter separator"). Root cause of 3 plan-013 round-1 defects, including this repo's own drafter.
- **D5 — No enforcement expansion.** Schema, CI wiring, and pre-commit hook changes stay out (items 4/11 own them). This plan changes WHERE truth lives and adds OPTIONAL lint — no new gates.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 gitignore split + initial tracked add | task-1.spec | 1 | orchestrator-inline Tier A |
| T2 docs/canon.md | task-2.spec | 1 | orchestrator-inline Tier A |
| T3 scripts/docs-lint.sh | task-3.spec | 1 | dispatched Tier B |
| T4 CONTRACT-FORMAT front matter | task-4.spec | 1 | orchestrator-inline Tier A |
| T5 README canon/lint pointers | task-5.spec (needs T2, T3) | 2 | orchestrator-inline Tier A |

Single wave pair: T1–T4 parallel (disjoint files), T5 after.

## Tasks

### TASK 1 (Tier A, ⚪): ✅ gitignore split + tracked add — orchestrator-inline
- Edit `.gitignore` per D1. `git add` the durable set. `git ls-files` proves LOG.md, CONTEXT.md, reviews/**, archive/**, proposals/** tracked; plan.md/scout/spikes/specs stay ignored.

### TASK 2 (Tier A, ⚪): ✅ docs/canon.md — orchestrator-inline
- Write the canon per D2 (~60 lines). No behavior change.

### TASK 3 (Tier B, 🟡): scripts/docs-lint.sh ✅
- **Contract**: task-3.spec · **Verify**: `bash scripts/docs-lint.sh` exits 0 (graceful-skip path with missing tools; gates when tools present) · fixture md with a broken link exercises lychee when installed.
- **Allowed**: scripts/docs-lint.sh (new)

### TASK 4 (Tier A, ⚪): ✅ CONTRACT-FORMAT front matter — orchestrator-inline
- Prepend the front-matter block to the template + terminator warning per D4. Verify: generate a fixture from the template, `agent-spec parse` exits 0.

### TASK 5 (Tier A, ⚪): ✅ README canon/lint pointers — orchestrator-inline
- README: link docs/canon.md from the Contract Format / structure section; one line on docs-lint. Keep section 7 (commands table) intact — drift section 7 must stay CLEAN.

## Adversarial pass (on record)

- Repo size: reviews/ + archive/ are text; growth is slow (13 plans ≈ small MBs). Accepted.
- Sensitive scratch: scout/ and spikes/ stay untracked — no accidental publication.
- gitignore negation trap: switching `.workflows/` → `.workflows/*` is required; a wrong form silently keeps everything ignored — T1's `git ls-files` check is the guard.
- lint tool absence: graceful-skip means CI without tools passes vacuously — accepted for now; CI wiring is item 4's scope.
- Single-surface: docs-lint adds a lint surface; it does not duplicate check-drift (drift = internal consistency of prompts/skills/agents; docs-lint = prose structure/links/style).

## Verification (whole-plan final gate)

`bash scripts/docs-lint.sh` (0 or graceful-skip) · `bash scripts/check-drift.sh` CLEAN · `bun test` 64/64 · `bash scripts/check-spec-selectors.sh` clean · `git ls-files` proves the durable set · cc-check format unchanged (known CONTRACTS:1:1). Final whole-plan reviewer dispatch (with bash granted — plan 013 review-final round-1 lesson).
