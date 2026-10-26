spec: task
name: "flow-gate-resolution-layer-commands"
tags: [flows, gates, degradation]
max-rounds: 2
---

## Intent

Resolve flow gate names to the command sets the repo already runs:
`contract` → agent-spec guard, `test-quality` → tdd-gate gaming, `review` →
check-drift + docs-lint. Absent toolchains skip loudly; findings block wave
settle.

## Decisions

- `scripts/flow-gates.mjs` exports `gateCommands(name)` and `runGate(name)`.
- runGate returns `{status: pass | fail | skipped, results}` — skipped only
  when the named binary is absent (`command -v`), with the reason recorded.
- Fail = any command exits non-zero.

## Boundaries

### Allowed Changes
- scripts/flow-gates.mjs
- tests/flows-gates.test.ts

### Forbidden
- scripts/flow-run.mjs, scripts/flow-schema.mjs
- extensions/index.ts

## Completion Criteria

Scenario: gate names resolve to the existing layer command sets
  Test: gate names resolve to the existing layer command sets
  Then contract, test-quality and review resolve to the documented commands

Scenario: gate findings block wave settle
  Test: gate findings block wave settle
  Then a failing command yields status fail with the failing command recorded

Scenario: absent toolchains skip loudly
  Test: absent toolchains skip loudly
  Then an absent binary yields status skipped with the toolchain named
