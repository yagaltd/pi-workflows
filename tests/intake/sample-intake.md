# Sample intake — fixture

Candidate requirement blocks in the agent-spec fork's marked-block format, as
emitted by a casual `/idea` or `/brainstorm` session. Format reference:
`tests/intake/README.md`. Blocks are candidates only: nothing here has been
imported, and import happens only on explicit human approval of specific
blocks. Rejected blocks stay in the intake file annotated `rejected: <reason>`.

<!-- agent-spec:requirement id="REQ-HISTORY-EXPORT" title="Export run history" tags="export, history" source="intake:sample-session" -->
## Problem

Teams lose the per-run trail (which contract ran, which wave, which verdict)
once a session ends, so post-mortems rely on scrollback.

## Requirements

[REQ-HISTORY-EXPORT] The workflow system MUST export a completed run's decision trail to a single markdown file on explicit request.

## Scenarios

Scenario: Export a finished run
  Given a completed run with at least one recorded decision
  When the export command runs for that run
  Then a markdown file is written containing every decision with its verdict

## Open Questions

- Where should the export land by default: repo root or `.workflows/runs/`?
<!-- /agent-spec:requirement -->

<!-- agent-spec:requirement id="REQ-INTAKE-APPROVAL" title="Human approval gate for requirement import" tags="guardrail, intake" -->
## Problem

An agent emitting candidate requirement blocks must never mutate the
requirement corpus on its own; import is a governance act.

## Requirements

[REQ-INTAKE-APPROVAL] The intake flow MUST NOT run the requirement import without explicit human approval of the specific blocks to import.

## Scenarios

Scenario: Unapproved import attempt
  Given an intake file with blocks no human has approved
  When the agent tries to import without approval
  Then the import is refused and the blocks stay annotated in the intake file

## Open Questions

None.
<!-- /agent-spec:requirement -->
