spec: task
name: "intent-tier-hook-suggestion"
tags: [extension, hook, tier]
max-rounds: 2
---

## Intent

Hook suggestion lines carry tier; an answer route (unrelated to the live
plan) appends the entry-command suggestion from tierRoute.

## Decisions

- Suggestion tail: kind=..., tier=..., confidence=...
- answer + tier problem → "consider /idea (or /brainstorm)"; solution →
  /plan; procedure → /add. proceed and ask-human stay silent. Tier
  optional in the type — old call sites keep compiling.

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/intent-hook.test.ts

### Forbidden
- scripts/intent-guard.mjs, scripts/judge.mjs, prompts/, README.md

## Completion Criteria

Scenario: hook suggestion carries the tier and entry command for problem-level answers
  Test: hook suggestion carries the tier and entry command for problem-level answers
  Then answer+problem suggests /idea, answer+solution suggests /plan, and amend lines carry tier=

Scenario: hook stays inert for commands custom messages or no live plan
  Test: hook stays inert for commands custom messages or no live plan
  Then slash prompts custom messages empty prompts and taskless plans produce no message
