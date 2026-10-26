spec: task
name: "flow-schema-validator-blocked-codes"
tags: [flows, schema, validator, zero-dep]
max-rounds: 2
---

## Intent

The flow format and its validator: `.workflows/flows/<slug>.json` — steps
(`task` | `gate` | `transform`), waves, `depends_on`. Pure-JS validation with
typed blocked codes; an invalid flow never reaches the dispatcher.

## Decisions

- Validator is dependency-free (TypeBox is only available under the pi host).
- Blocked codes: `schema-invalid`, `dup-id`, `unknown-kind`, `self-edge`,
  `cycle`, `missing-ref`, `empty-wave`, `bad-dep-wave`.
- Task steps carry title, tier (A|B|C), wave, depends_on, tdd, allowed
  (non-empty), verify, model/thinking/role. Gate steps carry `gate` in
  {contract, test-quality, review}. Transform steps carry a `set` object.

## Boundaries

### Allowed Changes
- scripts/flow-schema.mjs
- scripts/flow-validate.mjs
- tests/flows-validate.test.ts

### Forbidden
- scripts/flow-run.mjs, scripts/flow-gates.mjs (later tasks)
- extensions/index.ts, .workflows/evals/

## Completion Criteria

Scenario: flows validate against the schema with blocked codes
  Test: flows validate against the schema with blocked codes
  Then a valid flow passes and each malformed field yields its blocked code

Scenario: cycles self-edges and missing refs are blocked codes
  Test: cycles self-edges and missing refs are blocked codes
  Then cycle, self-edge and missing-ref codes are returned with the offending ids

Scenario: empty waves and duplicate ids are blocked codes
  Test: empty waves and duplicate ids are blocked codes
  Then empty-wave and dup-id codes are returned, plus bad-dep-wave
