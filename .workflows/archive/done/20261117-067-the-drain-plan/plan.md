# Plan 20261117-067 — The drain plan: ledger doctrine, the vacuous lint, boundaries lint, docs floor

> Plan ID: 20261117-067
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.3 — 20261117)
> Supersedes: none

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| 1 | Docs debt (~1009 mdl / 1115 harper) | done(T1) | budgets land at the measured floor (wave 2) |
| 2 | tdd-guard vacuous lint (.git filter, --tests default) | done(T3) | regression test runs from a .git/subagents path |
| 3 | spec-lint boundaries rule | done(T4) | criterion paths must resolve inside Allowed Changes |
| 4 | Ledger doctrine (report table + drain-before-grow) | done(T2) | FOLLOW-UP-TABLE wired, +Origin column |
| 5 | Terminal-before-report leak | done(T2) | registry doctrine + pin |
| 6 | bombadil / DEC-008 | closed(accepted-gap with revisit trigger, DEC-008) | nothing to do |

Token grammar (normative, implemented by T2 docs + T4 plan-check):
`done(<task-ref>)` · `closed(<reason>)` · `deferred(trigger: <condition>)`.

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

Owner review of the open ledger (20261117) raised three process defects: reports
dangle prose caveats with no why/impact/value table (while
`templates/FOLLOW-UP-TABLE.md` has existed unwired since the plan-047 era);
agents open new scope with undrained rows; and a ship post cited hunter findings
before the hunter's own result landed — an early-report leak, mislabeled "late
arrival". Separately: tdd-guard's `.git` substring filter on absolute paths
makes every lint run from a subagent worktree vacuously pass (0 test files =
silent green), plan 064 paid four review rounds for a spec whose criterion
contradicted its own Boundaries, and the docs-lint ratchet froze the stock of
~1009 markdownlint / ~1115 harper findings without ever paying it down.

## Exploration

- `templates/FOLLOW-UP-TABLE.md` — pinned 7-column format, "rows are facts",
  worked example; zero references in prompts/, agents/, skills/ (dead doctrine).
- `tdd-guard src/lint.ts:39,49,53` — `!f.includes(".git")` on absolute paths:
  any cwd containing `.git` (every subagent worktree: `.git/subagents/...`)
  filters ALL test files → vacuous pass; also excludes legit `.github/` paths.
  `src/cli.ts:30,56,82` — `--tests` defaults to "tests" with no probing.
- `agent-spec src/main.rs:418 cmd_lint` → `spec_lint::LintPipeline`; plan-check
  exists; no criterion-vs-boundaries rule; no ledger-resolution validation.
- DEC-008 — bombadil already terminal (accepted-gap + revisit trigger): row
  closed, nothing to build.
- `scripts/docs-lint-baseline.json` — per-file budgets, ratcheted, stock intact.

## Spec Map

- `.workflows/specs/task-1.spec` — docs floor (wave 2, after T2 lands)
- `.workflows/specs/task-2.spec` — ledger doctrine wiring (wave 1)
- `.workflows/specs/task-3.spec` — tdd-guard vacuous lint fix (wave 1)
- `.workflows/specs/task-4.spec` — agent-spec boundaries lint + ledger check (wave 1)

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): docs floor

- **Agent**: worker · **Wave**: 2 (after T2 merges) · **Depends On**: task-2
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (fix-round-067 task-1 section: fence P1 fixed + honest baseline; merged)
- **context: merged 94a7c3d — mdl 1011→335, harper 1121→1060, lychee 2→0, README fences valid, currency in architecture/canon**
- **Problem**: ~1009 mdl / ~1115 harper findings; budgets freeze the stock.
- **Allowed**: docs/**, templates/**, agents/**, skills/**, prompts/**,
  scripts/docs-lint-baseline.json, README.md
- **context: pending — dispatches now (wave 2); README included by recorded
  adjudication (DOCS-POLICY same-task rule: the docs task owns README currency)**
- **Adjudication (recorded fix-round-067)**: README.md added to TASK 1's
  Allowed — the hygiene sweep names it stale (7 code commits since last touch);
  the docs task is the same-task owner per DOCS-POLICY.
- **Verify**: bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh

### TASK 2 (⚪ STANDARD, Tier B): ledger doctrine wiring

- **Agent**: worker · **Wave**: 1 · **Depends On**: none
- **Contract**: .workflows/specs/task-2.spec
- **Status**: ✅ DONE (verdict reviews/task-2.md ok:true; merged)
- **context: merged — 5 pins green, baseline byte-identical, lint stock fell (mdl -15, harper -6)**
- **Problem**: the follow-up table is dead doctrine; reports dangle prose
  caveats; nothing forces drain-before-grow; no terminal-before-report rule.
- **Allowed**: templates/FOLLOW-UP-TABLE.md, agents/registry.md,
  agents/reviewer.md, skills/plan/SKILL.md, skills/review/SKILL.md,
  tests/prompt-doctrine.test.ts
- **Verify**: bun test && bash scripts/check-drift.sh

### TASK 3 (⚪ STANDARD, Tier B): tdd-guard vacuous lint fix

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: tdd-guard
- **Contract**: .workflows/specs/task-3.spec
- **Status**: ✅ DONE (fix-round-067: R1 ok:false resolved, R2 mechanical PASS, adjudication recorded)
- **context: merged 3b3983b — 16/16, tsc clean, global binary 0.1.2 via existing link (follow-up #1 dissolved)**
- **Problem**: `.git` substring on absolute paths vacuates every subagent
  worktree run; zero-file runs pass silently.
- **Allowed**: src/lint.ts, src/cli.ts, src/config.ts, tests/**, package.json,
  CHANGELOG.md, dist/**
- **Verify**: bunx vitest run && bunx tsc --noEmit

### TASK 4 (⚪ STANDARD, Tier B): boundaries lint + ledger check

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: agent-spec
- **Contract**: .workflows/specs/task-4.spec
- **Status**: ✅ DONE (fix-round-067 task-4 section: P1 lock revert applied + neutrality proof; merged d82ba0a)
- **context: merged + installed 0.3.2 — plan-check validates this plan's own ledger; carry-in rows 1-3**
- **Problem**: a criterion touching a path its own Boundaries forbid is
  undetected (4 review rounds in plan 064); ledger sections unvalidated.
- **Allowed**: src/spec_lint/**, src/main.rs, src/spec_gateway/** (only if
  plan-check parsing lives there), tests/**, Cargo.toml, CHANGELOG.md
- **Verify**: cargo test --quiet && cargo clippy --all-targets -- -D warnings

## Contracts (generated after approval)

- .workflows/specs/task-1.spec · task-2.spec · task-3.spec · task-4.spec

## Docs impact

- T2: templates/FOLLOW-UP-TABLE.md (+Origin column), registry, reviewer, plan
  and review skills — the format this plan's own ship report then uses.
- T3: tdd-guard 0.1.2 CHANGELOG · T4: agent-spec 0.3.2 CHANGELOG.
- T1: docs corpus to the floor + baseline rewrite; pi-workflows CHANGELOG
  v0.15.3 records the whole plan at SHIP.

## Execution Notes
