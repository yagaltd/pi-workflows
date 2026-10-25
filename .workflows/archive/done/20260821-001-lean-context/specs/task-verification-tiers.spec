spec: task
name: "Complexity-gated verification tiers"
tags: [registry, reviewer, tiers]
---

## Intent

Reviewer dispatch cost scales with task traits: pure-docs tasks get a low-thinking reviewer, security/concurrency/parsing/external-input tasks get the strongest model + xhigh — instead of one-size-fits-all. The verdict stays mandatory regardless of tier.

## Decisions

- Tiers live in agents/registry.md as a "Verification policy" table — single source of truth, views reference it
- Tier detection derives from spec tags + Intent + Boundaries (worker does not self-assess)
- Complexity scales reviewer cost, never its existence (doctrine #7 unchanged)

## Boundaries

### Allowed Changes
- agents/registry.md
- prompts/next.md
- prompts/auto-next.md

### Forbidden
- agents/execution-doctrine.md (TASK_3 territory)
- agents/dispatch-shapes.md, extensions/, tests/

## Completion Criteria

Scenario: Registry holds the tier table
  Test: grep -c "Verification policy" agents/registry.md
  Given registry.md updated
  Then it contains a Verification policy section with ≥3 tiers (docs-tier, standard-tier, high-risk-tier) mapping traits → reviewer model+thinking

Scenario: /next selects tier per task
  Test: grep -c "verification policy" prompts/next.md
  Given /next building the reviewer node
  Then its dispatch step references the registry verification policy for model+thinking selection

Scenario: auto-next selects tier per task
  Test: grep -c "verification policy" prompts/auto-next.md
  Given auto-next Step 2 building the wave graph
  Then reviewer task entries follow the registry verification policy

Scenario: Repo checks stay green
  Test: ./scripts/check-drift.sh
  Given all edits applied
  Then drift checker and unit tests exit 0

Verify: grep -q "Verification policy" agents/registry.md && bun test tests/ && ./scripts/check-drift.sh
