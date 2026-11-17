spec: task
name: dec-003-amendment
tags: [decision, gate, tdd-guard, blocking]
verify: "bun test tests/extension.test.ts tests/flows-gates.test.ts && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

DEC-003 makes `tdd-gate` the mandatory build-task test-quality gate, but `tdd-gate` is not installable: npm returns 404, no GitHub project matches, and the binary is absent from PATH. Three emitters therefore emit commands that can never run (dispatch gateCommandsFor, the auto-gate Layer 2 branch, flow-gates test-quality). Amend the decision to the tools that exist and make every emitter agree.

## Decisions

- Layer 2 becomes `agent-spec lifecycle <spec> --code . --layers lint,boundary,test,tdd-guard`, which drives agent-spec's existing `tdd_guard_verifier.rs` (`tdd-guard --version` then `tdd-guard lint`). A standalone run is `tdd-guard lint` / `tdd-guard verify --spec <spec>`.
- Accepted risk, recorded in DEC-003 itself: gaming, weakening and drift checks stay uncovered (the tradeoff already stated in .workflows/proposals/20261024-test-quality-cli.md). tdd-guard remains the deterministic gate.
- Absent tool stays advisory-loud, deduped, never a silent pass: the layer states it skipped and why.
- The `tdd:` task flag keeps its meaning (route through the two-phase TDD shape) but the coverage step now uses the same real chain.

## Boundaries

### Allowed Changes
- agents/reviewer.md
- agents/worker.md
- agents/execution-doctrine.md
- agents/dispatch-shapes.md
- extensions/index.ts
- scripts/flow-gates.mjs
- skills/plan/SKILL.md
- skills/add-feature/SKILL.md
- skills/fix/SKILL.md
- templates/CONTRACT-FORMAT.md
- templates/FOLLOW-UP-TABLE.md
- .workflows/decisions/DEC-003.md
- .workflows/decisions/INDEX.md
- tests/extension.test.ts
- tests/flows-gates.test.ts
- tests/flow-gates-mise.test.ts

### Forbidden
- docs/**, README.md (orchestrator's SHIP step)
- Adding a new dependency, vendoring or resurrecting a tdd-gate binary
- Any change to verdict semantics (who may mark a task done)

## Completion Criteria

Scenario: the decision names only tools that exist
  Test: DEC-003 cites the agent-spec tdd-guard layer and records the accepted risk
  Given the amended DEC-003
  When it is read
  Then it names `--layers lint,boundary,test,tdd-guard` and `tdd-guard lint|verify`
  And it states the accepted risk for gaming/weakening/drift
  And `tdd-gate` no longer appears as the gate

Scenario: no emitter references the nonexistent binary
  Test: grep over agents, extensions, scripts finds no tdd-gate
  Given the updated emitters
  When `grep -rn 'tdd-gate' agents extensions scripts` runs
  Then it returns nothing

Scenario: gate commands carry the real chain
  Test: extension pins assert the lifecycle layers command
  Given a task with the tdd: flag
  When gateCommandsFor builds its list
  Then the list contains the agent-spec lifecycle command with `--layers lint,boundary,test,tdd-guard`

Scenario: absent tool is loud, not silent
  Test: flow-gates pins assert the skip message
  Given tdd-guard absent from PATH
  When the test-quality flow gate runs
  Then it prints a skip naming the missing binary and the install hint
  And it does not report a pass

Scenario: doctrine lines agree with the decision
  Test: reviewer and fix/refactor doctrine name the same chain
  Given the role and skill files
  When they are read
  Then they name the same layer chain as DEC-003 and no dead binary
