# Plan 20261117-074 — drain the three batches: language coverage, parser idioms, plan-check docs

> Plan ID: 20261117-074
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.10 — 20261117)
> Supersedes: none (follows 20261117-073)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| 1 | tdd-guard language-coverage batch: SKIPPED-PY classification | done(T1) | mirrors the 073 rust classification |
| 2 | tdd-guard package-lock root version sync | done(T1) | rides the 0.1.6 bump |
| 3 | tdd-guard verify selector match: substring → word-anchored | done(T1) | unblocks the discovery widening (row 4); overmatch pin extended |
| 4 | discovery rust pattern widening from inside test dirs | deferred(trigger: a non-cargo rust-shaped repo needs lint there) | edge case; the enabling tightening ships in T1 |
| 5 | tdd-guard parser batch: conditional-idiom unwrap (test.skipIf(...)(name, fn) misread as assertionless — 11 false positives on pi-workflows) | done(T2) | wave 2, after T1 merges; parser lane kept separate per triage |
| 6 | agent-spec docs batch: plan-check documentation page | done(T3) | all validated sections documented |

Ship target: ledger EMPTY again (one deferred-with-trigger remains, which is a terminal state).

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The 073 ship left three batched P3 rows. Triage notes said: language-coverage
and parser batches are separate (parser semantics are delicate — own task);
the plan-check docs gap is standalone. This plan runs T1 (tdd-guard language
batch) and T3 (agent-spec docs) in wave 1, T2 (parser idioms) in wave 2 after
T1 merges so its fixture can build on the settled tree.

## Exploration

- tdd-guard lint testPatterns already match python (`**/test_*.py`,
  `**/*_test.py`) — SKIPPED-PY mirrors the 073 SKIPPED-RUST classification
  (scan-level, cargo/pyproject detection, loud line, exit 0).
- verify.ts selector resolution: `testNames.has(selector) ||
  allTestContent.includes(selector)` — the includes() leg is substring-loose:
  selector `test_my_pin` false-positives on content containing
  `test_my_pin_extended`. Word-anchored regex (escaped selector, \b both
  ends) fixes overmatch; identifier-shaped selectors make escaping safe.
- tdd-guard parser (acorn-based extraction): `test.skipIf(cond)(name, fn)`
  reads as an anonymous assertionless call — pi-workflows' requireLiveState
  idiom produces 11 such false positives. Unwrap member-call chains
  (skipIf/runIf/each/fails) before test-block extraction; negative pin:
  genuinely empty bodies inside the idiom stay flagged.
- agent-spec plan-check validates 4 sections (Dependencies, Ledger
  Resolution, Bottleneck, Sieve) with zero documentation.

## Spec Map

- `.workflows/specs/task-1.spec` — tdd-guard language batch + selector anchoring (T1, wave 1)
- `.workflows/specs/task-2.spec` — parser conditional-idiom unwrap (T2, wave 2)
- `.workflows/specs/task-3.spec` — plan-check docs page (T3, wave 1)

## Tasks

### TASK 1 (⚪ STANDARD): tdd-guard language batch + selector anchoring

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: tdd-guard
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (verdicts + records in reviews/fix-round-074.md; merged)

### TASK 2 (⚪ STANDARD): parser conditional-idiom unwrap

- **Agent**: worker · **Wave**: 2 · **Depends On**: T1 (merged) · **Repo**: tdd-guard
- **Contract**: .workflows/specs/task-2.spec
- **Status**: ✅ DONE (verdicts + records in reviews/fix-round-074.md; merged)

### TASK 3 (⚪ STANDARD): plan-check docs page

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: agent-spec
- **Contract**: .workflows/specs/task-3.spec
- **Status**: ✅ DONE (verdicts + records in reviews/fix-round-074.md; merged)

## Contracts (generated after approval)

- .workflows/specs/task-1.spec · .workflows/specs/task-2.spec · .workflows/specs/task-3.spec

## Docs impact

- tdd-guard README (SKIPPED-PY + selector anchoring) — T1, its repo
- agent-spec docs/plan-check.md (new) — T3, its repo
- `CHANGELOG.md` — pi-workflows v0.15.10 entry at SHIP

## Execution Notes
