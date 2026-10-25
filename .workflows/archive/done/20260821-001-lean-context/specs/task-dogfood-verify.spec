spec: task
name: "Live dogfood verification of the new loop"
tags: [dogfood, verification, evidence]
---

## Intent

Prove in live pi sessions that the unified graph and tier system work as designed, with recorded evidence — not self-reports.

## Decisions

- Evidence = subagent outputs + command results recorded in Execution Notes
- Scratch repo (fresh), same method as the 20260821 lean-context dogfood

## Boundaries

### Allowed Changes
- .workflows/plan.md (Execution Notes only)
- .workflows/reviews/ (verdict artifacts)
- .workflows/knowledge/ (evidence records)

### Forbidden
- Everything else — any code/prompt fix needed is a NEW task, not a silent edit

## Completion Criteria

Scenario: Reviewer auto-fires via needs edge
  Test: recorded evidence of zero orchestrator turns between worker and reviewer
  Given a sequential /next run in a scratch repo
  When the worker settles
  Then the reviewer ran in the same graph call with no intervening orchestrator dispatch (evidence: the single subagent call shape in the run output)

Scenario: Tier dispatch differs by task traits
  Test: recorded evidence of two different reviewer dispatches
  Given a docs-tier and a security-tier task
  When each runs
  Then the reviewer task entries differ in model/thinking per the registry verification policy

Scenario: Findings loop back
  Test: Execution Notes entry for this task
  Given drift or surprises found during dogfood
  Then they are recorded in Execution Notes (and filed as new tasks if fixes are needed — not silently fixed)

Verify: grep -c "20260821-001" .workflows/plan.md
