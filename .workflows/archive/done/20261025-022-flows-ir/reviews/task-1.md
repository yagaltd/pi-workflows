# Review — task-1 (flow schema + validator)

## Round 1
**ok: true**

Evidence: bun test flows-validate 4/4; blocked codes fixture-asserted (schema, unknown-kind, cycle, self-edge, missing-ref, empty-wave, dup-id, bad-dep-wave); zero-dep validator (TypeBox deviation recorded in plan).
Gaming check: cases build flows inline; codes asserted against the validator's contract, not its internals.
