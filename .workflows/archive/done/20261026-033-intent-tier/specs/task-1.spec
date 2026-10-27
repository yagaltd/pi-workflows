spec: task
name: "intent-tier-classify"
tags: [intent-guard, tier, routing]
max-rounds: 2
---

## Intent

classify asks kind + tier (problem | solution | procedure) in one judge
call; tierRoute maps each tier to its entry command; the trail and stdout
carry tier.

## Decisions

- tier question text: problem = no solution chosen; solution = approach
  chosen, design open; procedure = exact steps known.
- tierRoute: problem→idea, solution→plan, procedure→add.
- routeFor unchanged; skipped judge still fails open to ask-human.

## Boundaries

### Allowed Changes
- scripts/intent-guard.mjs
- tests/intent-guard.test.ts

### Forbidden
- extensions/index.ts, scripts/judge.mjs, prompts/

## Completion Criteria

Scenario: intent-guard classifies kind and tier in one judge call
  Test: intent-guard classifies kind and tier in one judge call
  Then classify returns route kind tier with confidences from one ask call and the stub sees both questions

Scenario: tier route maps problem solution procedure to entry commands
  Test: tier route maps problem solution procedure to entry commands
  Then tierRoute returns idea plan add and unknown tiers return null

Scenario: main appends the trail and always exits 0 fail-open
  Test: main appends the trail and always exits 0 fail-open
  Then the trail line carries tier and skip paths still exit 0
