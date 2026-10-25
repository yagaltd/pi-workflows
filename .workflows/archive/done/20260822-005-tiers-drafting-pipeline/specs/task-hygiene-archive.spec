spec: task
name: "Hygiene — spec archive, plan status header, await-loop economy"
tags: [hygiene, archive, doctrine, status, await]
max-rounds: 2
---

## Intent

De-noise every future review: consumed specs leave `.workflows/specs/`, plans carry a
single-writer status line, and the orchestrator's await loop gets engine-native economy rules.
Single tracked edit point: `agents/execution-doctrine.md`; the rest are gitignored `.workflows/` moves.

## Decisions

- D3+D4+D5 (plan 20260822-005). NOTE: `.workflows/` is **gitignored** — all spec-move verification
  is FILESYSTEM-based (`ls`/`test -f`), never `git status`.
- **Archive moves (retroactive)**: exactly nine consumed specs —
  - 003's five → `.workflows/archive/done/20260822-003-landing-hardening/specs/`:
    `task-doctrine-loop-upgrades.spec`, `task-log-memory.spec`, `task-registry-cwd-policy.spec`,
    `task-verify-landing-script.spec`, `task-worker-guard.spec`
  - 004's four → `.workflows/archive/done/20260822-004-model-registry-integrity/specs/` (create dir):
    `task-models-scan.spec`, `task-registry-integration.spec`, `task-reviewer-void.spec`,
    `task-docs-smoke.spec`
  - The five NEW 20260822-005 specs (task-hygiene-archive, task-plan-skill-tiers,
    task-registry-tiers, task-spec-drafter-role, task-docs-smoke-005) STAY in `.workflows/specs/`.
- **execution-doctrine.md gains one new section** `## Plan lifecycle & await economy` (after the
  loop section, before Verdict artifact format — insertions only, no existing rules reworded):
  1. **Status line**: every plan.md opens with `Status: DRAFT|DISPATCHED|EXECUTED|SHIPPED` —
     single writer is the orchestrator; per-task emoji flips only after that task's reviewer
     settles (stale-echo rule).
  2. **Ship ritual archive step**: at SHIP, consumed specs move to
     `.workflows/archive/done/<plan-id>/specs/` — reviewers and guard layers see only live specs.
  3. **Await-loop economy** (engine-native): background-first spawns; `autoAwait:true` only when
     the result gates the very next step; long runs use the slice-loop (`await_subagent` in short
     `timeoutMs` slices — process settled tasks incrementally, never park on the whole run);
     targeted `subagent_result(taskId)` for full text (completion notices stay 3-line); wake
     budget ≈ one await per wave; never re-read settled reports.

## Boundaries

### Allowed Changes
- .workflows/specs/ (the nine named moves — nothing else in or out)
- .workflows/archive/done/20260822-003-landing-hardening/specs/ (receives five)
- .workflows/archive/done/20260822-004-model-registry-integrity/ (new, receives four)
- agents/execution-doctrine.md (one inserted section)
- AMENDED (round 2, orchestrator): .workflows/archive/done/20260822-003-landing-hardening/task-reviewer-void.spec
  (receives the ONE pre-existing 003-era stray relocated from its specs/ dir — documented exception:
  003's ship pre-dates the archive rule and archived six specs; the filename collides with 004's
  task-reviewer-void.spec, so the stray lives at the plan root, content preserved, never deleted)

### Forbidden
- Everything else — skills/**, agents/registry.md, agents/dispatch-shapes.md, agents/spec-drafter.md,
  README.md, .workflows/LOG.md, .workflows/plan.md, scripts/**, models/**, tests/**, extensions/**
- Deleting (not moving) specs; touching the five live 005 specs; rewording existing doctrine rules

## Completion Criteria

Scenario: Consumed specs archived by plan
  Test: ls .workflows/specs/ | sort
  Then exactly the five 20260822-005 specs remain

Scenario: 003 archive complete
  Test: ls .workflows/archive/done/20260822-003-landing-hardening/specs/ | wc -l
  Then 5 — the five named 003-era specs present, non-empty; AMENDED (round 2): the historical
  003-era stray task-reviewer-void.spec additionally resides at the archive plan root (documented
  exception above) — its presence there is compliant, its absence from specs/ is required

Scenario: 004 archive created
  Test: test -d .workflows/archive/done/20260822-004-model-registry-integrity/specs && ls .workflows/archive/done/20260822-004-model-registry-integrity/specs/ | wc -l
  Then 4 — the four named 004 specs present, non-empty

Scenario: Doctrine section present with all three rules
  Test: grep -n "Plan lifecycle & await economy" agents/execution-doctrine.md && grep -c "Status: DRAFT" agents/execution-doctrine.md && grep -c "archive/done" agents/execution-doctrine.md && grep -c "slice" agents/execution-doctrine.md
  Then section exists; status-line, archive-step, and slice-loop rules all greppable

Scenario: Insertions-only doctrine edit
  Test: git diff agents/execution-doctrine.md | grep -c '^-[^-]'
  Then 0 (no deletions outside diff markers); existing rules (loop, tripwire, consolidated review) intact
