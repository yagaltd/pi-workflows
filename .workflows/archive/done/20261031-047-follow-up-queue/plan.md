# Plan 20261031-047 — follow-up queue: state-free suite, contract lint, guard scoping

> Plan ID: 20261031-047

**Status:** DONE (shipped 20261031 — whole-plan review PASS; reviews/fix-round.md + task-1..5.md)
**Evidence:** plan 046 review + fix-round findings (reviews/fix-round.md); scout 20261031: 20 test files reference `.workflows/`; CONTRACTS:1 is prose; guard invoked multi-spec at scripts/flow-gates.mjs:12 + prompts/verify.md:13; tdd-gate binary absent, `tdd-guard` optional peer declared.
**Intent:** close the five follow-up items left by plan 046: suite passes on fresh checkouts, cc-check clean, guard false-positives gone, authoring guidance recorded, tdd-gate disposition decided.

## Docs impact
- `templates/CONTRACT-FORMAT.md` — repo-truth cross-check rule for content-fact scenarios
- `skills/review/SKILL.md` — repo-faithful layout note for reviewer briefs
- `CHANGELOG.md` — release entry at SHIP

## Decisions
1. **Suite hardening = mixed mode** (ASSUMPTION, veto at gate): behavior tests move to fixture/synthetic state; live-consistency tests (guards over the maintainer's real repo) skip LOUD with a named reason when state is absent. Target: `bun test` = 0 fail in a tracked-files-only worktree.
2. **CONTRACTS fix**: probe cc-check's comment tolerance; move the Scope prose into an accepted comment form or relocate it to docs. `cc-check format` must exit 0.
3. **Guard fix = per-spec scoping at OUR call sites** (flow-gates contract gate + prompts/verify.md); upstream agent-spec left alone; the multi-spec false-positive reproduces only in dir mode.
4. **tdd-gate = accepted skip, item closed**: binary absent is an environment fact; pipeline already degrades loudly. No install attempt.
5. **Spec-authoring guidance** lands in CONTRACT-FORMAT.md (repo-truth cross-checks for content-fact scenarios) + review SKILL (repo-faithful layouts in reviewer briefs) — origin: plan 046 fabricated-recipes + probe-layout lessons.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | Suite state-hardening: fixtures + loud skips | 🟠 VERIFICATION_HEAVY | example-based | 1 | — |
| TASK_2 | worker | CONTRACTS preamble → cc-check clean | ⚪ | example-based | 1 | — |
| TASK_3 | worker | Guard per-spec scoping at call sites | ⚪ | example-based | 1 | — |
| TASK_4 | worker | Authoring + reporting standards (CONTRACT-FORMAT, review SKILL, follow-up table) | ⚪ | — | 1 | — |
| TASK_5 | worker | tdd-gate disposition record | ⚪ | — | 2 | TASK_1-4 |

## Tasks

### TASK 1 (Tier B, 🟠): Suite state-hardening
- **Agent**: worker
- **Depends On**: none
- **Wave**: 1
- **Allowed**: tests/** (wiring + golden-set + closeout/decision/flows/intent/lessons/queue/ship families)
- **Contract**: .workflows/specs/task-1.spec
- **What**: Per Decision 1 — behavior tests run on fixture/synthetic state; live-consistency tests skip loud (named reason to stderr) when `.workflows/` live state is absent. No test weakened: every skip names what it would check.
- **Verify**: fresh-worktree probe: `git worktree add` tracked-only → `bun test` → 0 fail; on the live checkout → 225/0 unchanged
- **Status**: ✅ DONE (verdict ok:true, reviews/task-1.md; merged d67e072 + cbc9c6f; no-weakening scan pass)
- context: tests read fixtures/loud-skips via requireLiveState instead of gitignored live state — fresh worktrees green (214/11-skip/0 fail)
- context: tests read fixtures/loud-skips instead of gitignored live state — see state-helpers.ts
- [PARALLEL-GROUP: A]

### TASK 2 (Tier B, ⚪): CONTRACTS preamble fix
- **Agent**: worker
- **Depends On**: none
- **Wave**: 1
- **Allowed**: CONTRACTS
- **Contract**: .workflows/specs/task-2.spec
- **What**: Probe cc-check comment tolerance; relocate the Scope prose so `cc-check format` exits 0 with all directives intact.
- **Verify**: `cc-check format` exit 0
- **Status**: ✅ DONE (verdict ok:true after literal fix, reviews/task-2.md; merged 1b6c85d + 0f45eae)
- context: updated — CONTRACTS starts with @cc directives; Scope rule relocated to docs/architecture.md Durable rules
- [PARALLEL-GROUP: A]

### TASK 3 (Tier B, ⚪): Guard per-spec scoping
- **Agent**: worker
- **Depends On**: none
- **Wave**: 1
- **Allowed**: scripts/flow-gates.mjs, prompts/verify.md
- **Contract**: .workflows/specs/task-3.spec
- **What**: Replace multi-spec guard invocations with per-spec scoping (probe `agent-spec guard --help` for the single-spec form); kill the absolute/relative boundary false-positive from plan 046's T4 review.
- **Verify**: multi-spec repo state → guard output shows zero in-scope false violations; flow-gates contract gate still fails real boundary violations (negative probe)
- **Status**: ✅ DONE (verdict ok:true, reviews/task-3.md; merged 3a525f8; test-file grant logged)
- context: updated — guard per-spec scoping at flow-gates + verify.md; flows-gates assertion follows

### TASK 4 (Tier B, ⚪): Authoring + reporting standards
- **Agent**: worker
- **Depends On**: none
- **Wave**: 1
- **Allowed**: templates/CONTRACT-FORMAT.md, skills/review/SKILL.md, templates/FOLLOW-UP-TABLE.md (new)
- **Contract**: .workflows/specs/task-4.spec
- **What**: (a) CONTRACT-FORMAT writing rules: content-fact scenarios carry repo-truth cross-checks (origin: plan 046 fabricated-recipes). (b) review SKILL: reviewer briefs specify repo-faithful layouts for runtime probes. (c) NEW standard template `templates/FOLLOW-UP-TABLE.md` — the follow-up/issue table: columns `# / Item / Problem (plain words) / Impact if unfixed / Risk (P0–P3) / Effort (S/M/L) / Fix shape`; mandatory in /review Stage 2 findings, /idea backlog output, and plan `## Risks` sections; ≤7 columns, one line per cell, plain words.
- **Verify**: `bash scripts/check-drift.sh` CLEAN; greps for the new rules and the template; demo table rendered for the plan 047 queue itself
- **Status**: ✅ DONE (verdict ok:true after literal fix, reviews/task-4.md; merged 4c847ec + 0f45eae)
- [PARALLEL-GROUP: SOLO]

### TASK 5 (Tier B, ⚪): tdd-gate disposition
- **Agent**: worker
- **Depends On**: TASK 1, TASK 2, TASK 3, TASK 4
- **Wave**: 2
- **Allowed**: .workflows/LOG.md
- **Contract**: .workflows/specs/task-5.spec
- **What**: Record the accepted skip decision (LOG + decision index if standing) per Decision 4.
- **Verify**: `node scripts/decisions.mjs check --plan .workflows/plan.md` CLEAN; LOG entry present
- **Status**: ⬜ PENDING

(No verify/quality tasks in plan: `/next` verdict-gates every task automatically; `/review` is the final gate at SHIP.)

## Risks
- 🟠 TASK 1: largest surface (~17 test files); skip-loud must never become skip-silent — reviewer checks every skip names its missing check.
- Parallel group A is 4 tasks — disjoint boundaries verified.
