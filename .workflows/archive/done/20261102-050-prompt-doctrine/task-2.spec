spec: task
name: prompt-doctrine-dispatch-policy
tags: [doctrine, registry, tdd]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

The dispatch layer learns the same three steals: budgets become an orchestrator assignment duty, the reviewer gains a cite-check, the contract format gains an optional Budget section.

## Decisions

- agents/registry.md: dispatch policy gains — "The orchestrator assigns each task's budget in the pack (default 60 tool calls from role doctrine; judge/API-call caps explicit when the task touches judge/API surfaces)."
- agents/execution-doctrine.md: report rules gain the Done-when assertion duty (final report asserts each Done-when line).
- prompts/verify.md: reviewer checklist gains — "Cite-check: spot-check factual claims in doc-producing tasks carry file:line/URL citations; uncited claims are findings." ADDITIVE only (proof-docs.test.ts pins existing wording — must stay green).
- templates/CONTRACT-FORMAT.md: optional `## Budget` section documented (human-readable prose in the contract; NOT an agent-spec parser key).
- tests/prompt-doctrine.test.ts gains the T2 pins (T1's file, extended — coordinate by keeping T2 additive to the same file).

## Boundaries

### Allowed Changes
- agents/registry.md
- agents/execution-doctrine.md
- prompts/verify.md (additive)
- templates/CONTRACT-FORMAT.md
- tests/prompt-doctrine.test.ts (extend)

### Forbidden
- Do not modify agents/worker.md, agents/reviewer.md (T1's files)
- Do not change spec parser formats or scripts/flow-*

## Completion Criteria

Scenario: registry budget policy pinned
  Test: registry dispatch policy assigns per-task budgets in the pack
  Given agents/registry.md after the edit
  When the pin test reads it
  Then it contains the per-task budget assignment duty

Scenario: execution-doctrine done-when pinned
  Test: execution doctrine report rules carry the Done-when assertion duty
  Given agents/execution-doctrine.md
  When the pin test reads it
  Then it contains the Done-when assertion duty

Scenario: verify.md cite-check additive
  Test: verify reviewer checklist gains the additive cite-check line
  Given prompts/verify.md after the edit
  When proof-docs.test.ts and the pin test run
  Then the cite-check line is present and every existing pin passes

Scenario: contract format documents Budget
  Test: contract format documents the optional Budget section \(prose, not a parser key\)
  Given templates/CONTRACT-FORMAT.md
  When the pin test reads it
  Then the optional Budget section is documented as prose, not a parser key
