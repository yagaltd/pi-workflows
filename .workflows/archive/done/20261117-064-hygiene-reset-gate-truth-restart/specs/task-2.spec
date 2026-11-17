spec: task
name: retro-archive-055-063
tags: [archive, adr, hygiene]
verify: "bun test"
max-rounds: 2
---

## Intent

Eight plans shipped without an archive bundle (055-060, 062, 063; 061 was retired by TASK 1): CHANGELOG has the entries, LOG has the lines, reviews/plan-NN.md exists for each, but no `.workflows/archive/done/<id>-*` dir. Back-fill one bundle per plan id so the archive matches the shipped history, and record the gap itself in an ADR so the cause is durable knowledge rather than a silent hole.

## Decisions

- The original `plan.md` text for those plans is lost (overwritten per plan). Each bundle therefore opens with an explicit reconstruction header, then carries the surviving evidence verbatim: the CHANGELOG entry, the LOG lines, the review verdict.
- Archive dir names follow the existing convention `<plan-id>-<slug>`; the slug comes from the CHANGELOG entry title.
- DEC-006 records: the gap, its cause (SHIP ran without the archive step), the rule "a shipped plan id without an archive dir is drift", and the two accepted cosmetics (agent-spec remote named `fork`; `target/` symlinked into the mise cache).

## Boundaries

### Allowed Changes
- .workflows/archive/done/**
- .workflows/decisions/DEC-006.md
- .workflows/decisions/INDEX.md

### Forbidden
- Any production path (scripts/, prompts/, skills/, agents/, extensions/, docs/, tests/, README.md, CHANGELOG.md)
- .workflows/plan.md, .workflows/LOG.md, .workflows/specs/** (orchestrator-owned state)

## Completion Criteria

Scenario: every back-filled plan id has a bundle
  Test: archive dir per plan id 055-060,062,063
  Given the plan ids 20261103-055, 20261103-056, 20261103-057, 20261104-058, 20261104-059, 20261104-060, 20261104-062, 20261104-063
  When the worker finishes
  Then each id has exactly one dir under .workflows/archive/done/
  And each dir contains plan.md and reviews/plan-<id-suffix>.md

Scenario: reconstruction is honest, never invented
  Test: plan.md header states the original text is lost
  Given a back-filled bundle
  When its plan.md is read
  Then the first block states the original plan text is lost and names the reconstruction sources
  And the CHANGELOG entry text and the review verdict appear verbatim
  And no execution detail is fabricated that the sources do not contain

Scenario: the archive gate passes for every bundle
  Test: check-archive.sh per bundle
  Given the created bundles
  When `bash scripts/check-archive.sh <dir>` runs for each
  Then every run exits 0

Scenario: the gap is recorded as a decision
  Test: DEC-006 exists and is indexed
  Given the created ADR
  When `node scripts/decisions.mjs index` runs
  Then DEC-006 appears in .workflows/decisions/INDEX.md with scope and revisit-when

Scenario: no production path changed
  Test: git status limited to archive and decisions
  Given the completed task
  When `git status --porcelain` runs
  Then only .workflows/archive/**, .workflows/decisions/** and this spec appear
