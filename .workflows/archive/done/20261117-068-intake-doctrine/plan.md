# Plan 20261117-068 — intake doctrine: triage, in-scope-must-fix, generous boundaries, progress-gated rounds

> Plan ID: 20261117-068
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.4 — 20261117)
> Supersedes: none (follows 20261117-067)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| 1 | agent-spec historical-specs carve-out | done(T2) | frozen-spec decision + markers; boundaries-path applies to new/revised specs |
| 2 | tdd-guard verify batch (Rust binding + shared discovery) | deferred(trigger: next tdd-guard plan touching verify) | real code work; loud-fail stays until then |
| 3 | tdd-guard hygiene batch (README docs, vitest exclude) | deferred(trigger: next tdd-guard plan) | enhancements, not defects |
| 4a | pi-workflows in-scope cosmetics (stray numbering, example cells) | done(T1) | they sit inside T1's Allowed — the in-scope-must-fix rule, applied to ourselves |
| 4b | pi-workflows cosmetic stock (charter pass, harper sweep, mdl config) | closed(cosmetic; intentional stock documented; a config file is new surface for zero reader gain) | delete-not-queue, applied |
| 5 | doc-task selector pins (verify binds nothing on doc-only specs) | done(T1) | spec-authoring guidance: content-fact scenarios cite grep-able pins |

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

Plan 067 shipped the ledger machinery; its first real run produced 12 rows where
5 decision-grade rows belonged. Owner review found two process defects and one
mis-tuned knob: (1) no triage gate between worker reports and the durable
queue — every worker row transcribed as-is; (2) workers queue findings that sit
INSIDE their own Allowed (proven: the stray "5." was in T2's Allowed list)
instead of fixing them in the loop; (3) boundary drawing at spec time is not
guided toward pre-authorizing adjacent fixes; and the owner asked whether
max-rounds: 5 would shrink the ledger — the data says no (80/109 tasks pass R1,
~20 need R2, two ever went deeper, and exhaustion meant a spec defect: 064
fixed it by amending the spec, not by retrying). The knob that exists is
per-spec and progress-gating is the honest generalization.

## Exploration

- `templates/FOLLOW-UP-TABLE.md` — has delete-not-queue but no four-way triage;
  P3/S rows ("disposition-able" per its own scale) queued 7 times in 067.
- `agents/worker.md:95,345` — "note it and keep" / "Scope lock ... report it":
  correct for out-of-scope, silent on in-scope findings; nothing obliges the
  worker to fix what its own Allowed covers.
- `agents/reviewer.md` — scope checks exist; no rule that a queued in-scope
  item is a finding; verdict block has ok/ok:false only — no extension grant.
- `skills/plan/SKILL.md` — contract template has no boundary-generosity
  guidance; no doc-scenario selector rule (verify exited 1 on T1's doc-only
  spec — loud but noise for a docs task).
- Round data (109 reviews): 80 pass R1, ~20 R2, 7 R3, 2 beyond; 064's round-3
  happened via spec amendment ("spec corrected to 3").

## Spec Map

- `.workflows/specs/task-1.spec` — intake doctrine + in-scope fixes (pi-workflows)
- `.workflows/specs/task-2.spec` — frozen-spec carve-out decision (agent-spec)

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): intake doctrine + in-scope fixes

- **Agent**: worker · **Wave**: 1 · **Depends On**: none
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (fix-round-068: R1 in-scope finding resolved; merged)
- **context: merged 1219712 — the doctrine enforced itself on its own worker; 7 pins green**
- **Problem**: no intake triage; in-scope findings queue instead of fixing;
  no boundary-generosity guidance; no progress-gated round extension; doc-task
  selectors bind nothing.
- **Allowed**: templates/FOLLOW-UP-TABLE.md, agents/worker.md, agents/reviewer.md,
  skills/plan/SKILL.md, skills/review/SKILL.md, tests/prompt-doctrine.test.ts
- **Verify**: bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh

### TASK 2 (⚪ STANDARD, Tier B): frozen-spec carve-out decision

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: agent-spec
- **Contract**: .workflows/specs/task-2.spec
- **Status**: ✅ DONE (reviewer ok:true; merged agent-spec main)
- **context: 11 specs frozen + test-pinned; plan-067's truncated count corrected to 16/11**
- **Problem**: boundaries-path rule flags 11 historical specs whose scenarios
  cite example paths; no durable decision separates frozen specs from the rule.
- **Allowed**: specs/**, docs/**, CHANGELOG.md, tests/**
- **Verify**: cargo test --quiet && cargo clippy --all-targets -- -D warnings

## Contracts (generated after approval)

- .workflows/specs/task-1.spec · task-2.spec

## Docs impact

- `templates/FOLLOW-UP-TABLE.md`, `agents/worker.md`, `agents/reviewer.md`,
  `skills/plan/SKILL.md`, `skills/review/SKILL.md` — the four doctrine edits
  (T1); `specs/**`, `docs/**`, `CHANGELOG.md` — the frozen-spec decision (T2);
  `CHANGELOG.md` — pi-workflows v0.15.4 entry at SHIP.

## Execution Notes
