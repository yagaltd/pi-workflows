spec: task
name: "intent-guard-suggestion-hook"
tags: [extension, hook, before_agent_start, suggest]
max-rounds: 2
---

## Intent

A suggest-only `before_agent_start` hook: classify the user prompt against
the live plan, inject a routing suggestion, append the trail. Never blocks,
never rewrites the prompt, fails open.

## Decisions

- Applies when: messageType user, non-empty prompt, prompt not starting
  with `/`, live plan has tasks. Otherwise inert (undefined).
- Route messages: amend → suggest /amend; answer → answer directly, do not
  start tasks; ask → one clarifying question; proceed and ask-human → no
  message.
- classify imported from scripts/intent-guard.mjs (DEC-001); import or call
  failure = fail-open, no message.

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/intent-hook.test.ts

### Forbidden
- scripts/intent-guard.mjs, scripts/judge.mjs, README.md

## Completion Criteria

Scenario: hook builds a suggest-only message for user prompts on a live plan
  Test: hook builds a suggest-only message for user prompts on a live plan
  Then amend and answer and ask routes produce the suggestion message with route kind and confidence

Scenario: hook stays inert for commands custom messages or no live plan
  Test: hook stays inert for commands custom messages or no live plan
  Then slash prompts, custom messages, empty prompts, and plans without tasks produce no message

Scenario: hook appends the verdict to the intent trail
  Test: hook appends the verdict to the intent trail
  Then the trail line carries query route kind confidence and threshold
