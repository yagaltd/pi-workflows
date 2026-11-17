spec: task
name: intake-honesty
tags: [docs, honesty, deferral]
verify: "bun test"
max-rounds: 2
---

## Intent

`agent-spec requirements import` is documented as a live step for `/idea` and `/brainstorm`, but the installed 0.2.7 binary has no such subcommand, the local agent-spec repo has no such implementation, and the fork the docs cite (~/Documents/vibe/coding-agent/agent-spec) no longer exists. The feature is deferred; the instructions must say so instead of asking users to run a command that cannot run.

## Decisions

- The marked-block format record stays (`tests/intake/README.md`): it is the specification a future implementation must satisfy.
- `/idea` and `/brainstorm` keep emitting candidate blocks; they stop short of invoking the importer and say the import step is deferred.
- The deferral is a decision (DEC-007): revisit when an import command exists in the installed binary. DEC-007's scope names `docs/architecture.md` so the SHIP reframe cannot be forgotten.
- Repo-wide `docs-lint` is TASK 6's gate (its ratchet), not this task's verify line: a prompt-text task must not be gated on another subsystem's pre-existing debt.

## Boundaries

### Allowed Changes
- prompts/idea.md
- prompts/brainstorm.md
- tests/intake/README.md
- .workflows/decisions/DEC-007.md
- .workflows/decisions/INDEX.md

### Forbidden
- docs/**, README.md (orchestrator's SHIP step)
- Implementing an importer, vendoring a fork, or inventing a replacement format
- tests/intake/fixtures or rendered output

## Completion Criteria

Scenario: the dead command leaves the live instruction paths
  Test: grep finds no live requirements-import instruction in the paths this task owns
  Given the edited prompts and the intake format record
  When `grep -rn 'requirements import' prompts tests/intake` runs
  Then matches appear only inside a deferral notice that states the command is absent
  And nothing in those paths tells a reader to run it
  (docs/architecture.md keeps a live instruction until SHIP reframes it — out of this
  task's boundaries by design, recorded for TASK 8, not a TASK 5 criterion)

Scenario: block emission survives
  Test: both triggers still describe the marked-block format and the stop point
  Given prompts/idea.md and prompts/brainstorm.md
  When they are read
  Then each names the marked requirement-block format and the human approval gate
  And neither instructs running the nonexistent import command

Scenario: the format record is explicit about its status
  Test: intake README states the parser is absent
  Given tests/intake/README.md
  When it is read
  Then it states the importer is not present in the installed binary
  And it labels the fixtures a format record, not a passing check

Scenario: the deferral is a decision of record
  Test: DEC-007 exists with a revisit trigger
  Given the ADR written for the deferral
  When `node scripts/decisions.mjs index` runs
  Then DEC-007 appears with scope and revisit-when naming a working import command
