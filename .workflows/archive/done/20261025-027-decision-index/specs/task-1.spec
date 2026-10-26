spec: task
name: "decision-records-cli-check"
tags: [decisions, index, adr, revisit]
max-rounds: 2
---

## Intent

`scripts/decisions.mjs`: short decision records under
`.workflows/decisions/`, a generated INDEX.md, supersede with reason, and a
`check` gate — index in sync, records well-formed, `adr: DEC-NNN` references
in the live plan resolved.

## Decisions

- Record fields parsed from the header quote block: `Status`, `Decided-by`,
  `Scope`, `Revisit when`; body carries `Rule:` (one binding sentence).
- `record --id --title --rule --scope --decided-by --revisit [--status]`
  writes the file + regenerates INDEX.md. `supersede --id --by <DEC-NNN>
  --reason "<why>"` marks the record and regenerates.
- `check [--plan .workflows/plan.md]`: regenerated INDEX differs from file ⇒
  fail (index drift); missing required fields ⇒ fail; unresolved `adr:` ids
  ⇒ fail; superseded record pointing at a missing successor ⇒ fail.
- `main(argv)` exported for tests; all paths explicit flags.

## Boundaries

### Allowed Changes
- scripts/decisions.mjs
- tests/decisions.test.ts

### Forbidden
- .workflows/decisions/ (task-2 seeds records)
- prompts/, skills/, README.md, extensions/index.ts

## Completion Criteria

Scenario: decision records round-trip through record list and supersede
  Test: decision records round-trip through record list and supersede
  Then record writes the file + index, supersede marks it with successor and reason, list shows current statuses

Scenario: adr references in the live plan resolve to records
  Test: adr references in the live plan resolve to records
  Then check passes when every adr: id exists and fails on an unresolved id

Scenario: check flags index drift and unresolved references
  Test: check flags index drift and unresolved references
  Then a hand-edited INDEX.md or a malformed record fails check with the finding named
