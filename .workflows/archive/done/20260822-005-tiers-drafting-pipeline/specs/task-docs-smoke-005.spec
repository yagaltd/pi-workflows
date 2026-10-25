spec: task
name: "Docs + smoke (tiers + drafting pipeline + hygiene)"
tags: [docs, smoke, verification]
max-rounds: 2
---

## Intent

Document the three new surfaces and prove them by grep/run — honestly, PASS/FAIL/SKIP each.

## Decisions

- D6 (plan 20260822-005). README gains/extends a **"Planning"** subsection under the workflow
  docs: one paragraph on tiers (A mechanical / B bounded / C spike — decided at plan time, routed
  via the registry) and one on the **delegated drafting pipeline** (scout facts → strong-model
  draft → adversarial split/risk pass → spec-drafter fan-out → human gate; plans draft faster and
  review cheaper). Plus one sentence in the archive/status note: consumed specs archive at ship;
  plans carry a single-writer status line.
- `.workflows/LOG.md`: plan-005 completion entry with the smoke table.
- SMOKE (all checks run post-final-edit):
  1. Archive state: `.workflows/specs/` holds ONLY the five 005 specs; 003 archive dir has 5;
     004 archive dir has 4 (filesystem `ls`, .workflows is gitignored).
  2. Tier routing: `grep -ci "tier" agents/registry.md` ≥ 8 incl. column header; routing-overlay
     subsection + `orchestrator-inline` present.
  3. spec-drafter: row in `agents/registry.md` Roles table + `agents/spec-drafter.md` exists
     (≤70 lines).
  4. Plan skill: five drafting phases + three tiers greppable in `skills/plan/SKILL.md`; zero
     deletions in its git diff.
  5. Doctrine: `Plan lifecycle & await economy` section with status line + archive step +
     slice-loop; insertions-only diff.
  6. Repo suite: `bun test` green (37+ tests).
- A FAIL is recorded as FAIL with reproduction; never massaged to PASS.

## Boundaries

### Allowed Changes
- README.md
- .workflows/LOG.md

### Forbidden
- Everything else — all agents/**, skills/**, .workflows/specs/**, .workflows/archive/**,
  scripts/**, models/**, tests/**, extensions/**, templates/**, prompts/**

## Completion Criteria

Scenario: README documents tiers + pipeline
  Test: grep -n "Tier A" README.md && grep -c "spec-drafter" README.md
  Then planning subsection covers tiers + drafting pipeline + archive/status note

Scenario: Smoke complete and honest
  Test: grep -c "PASS\|FAIL\|SKIP" .workflows/LOG.md (within the plan-005 entry)
  Then 6 checks each with a verdict; SKIPs carry reasons; FAILs carry reproduction

Scenario: Repo suite green
  Test: bun test
  Then 0 failures
