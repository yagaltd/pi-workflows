spec: task
name: output-policy
tags: [output, policy, format]
verify: "bun test tests/output-policy.test.ts"
max-rounds: 2
---

## Intent

Add `scripts/output-policy.mjs`: one pure, deterministic function that decides which output surfaces a rendering task gets. Canonical prose and status tokens are unconditional; tables and diagrams are earned by explicit thresholds. TASK 3–6 consume this single policy instead of growing a second decision path.

## Decisions

- Export one pure function `decideOutputPolicy(input)` from `scripts/output-policy.mjs`; no I/O, no clock/randomness, no judge/TypeLLM client import, no mutation of the input object.
- Return an object whose own keys are exactly `prose`, `statusTokens`, `table`, `diagram` — all booleans. `prose` and `statusTokens` are always `true`, including for empty, partial, and negative inputs.
- Input signals are plain numbers/flags: `rows`, `fields`, `artifact`, `tasks`, `dependencies`, `waves`, `statusMix`, `fixLoop`, `stateMachine`, `components`, `links`. Missing numbers count as 0, missing flags as `false`.
- Table: `table === true` iff `(rows >= 3 && fields >= 3) || artifact === 'closeout-next-moves'`. The mandatory close-out/next-moves table stays text with pinned columns and is never swapped for an image.
- Diagram: `diagram === true` iff `(tasks >= 4 && (dependencies >= 2 || waves >= 2 || statusMix >= 2)) || fixLoop === true || stateMachine === true || (components >= 3 && links >= 2)`. A diagram is additive only; it never replaces prose, status tokens, or the mandatory table.
- Never image-only: no `image`, `imageOnly`, `path`, or `render` output field; PNG/SVG is a generated view with alt text, and text gates keep reading the markdown report.
- No judge call, no I/O, no plan or status grammar change. TASK 2 renders; TASK 4 displays; this module only decides. Do not modify `scripts/format-chooser.mjs` or `scripts/closeout.mjs` here — TASK 3 and TASK 6 own those seams.

## Boundaries

### Allowed Changes
- .workflows/specs/task-1.spec
- scripts/output-policy.mjs
- tests/output-policy.test.ts

### Forbidden
- .workflows/plan.md
- scripts/format-chooser.mjs
- scripts/closeout.mjs
- extensions/index.ts
- prompts/**
- docs/**
- README.md
- CHANGELOG.md
- tests/** other than `tests/output-policy.test.ts`
- .workflows/specs/** other than `.workflows/specs/task-1.spec`
- Do not add a judge call, I/O, or plan grammar change

## Completion Criteria

Scenario: prose and status tokens are unconditional
  Test: test_output_policy_always_prose
  Given `decideOutputPolicy` imported from `scripts/output-policy.mjs`
  When it is called with `{}`, with `{ rows: 1, fields: 1, tasks: 1 }`, and with `{ rows: 0, fields: 0, tasks: 0, dependencies: 0, waves: 0, statusMix: 0, components: 0, links: 0 }`
  Then every result has `prose === true` and `statusTokens === true`
  And every result's own key set is exactly `prose`, `statusTokens`, `table`, `diagram`
  And two calls with the same input return deep-equal results and the input object is unchanged

Scenario: table needs three rows and three comparable fields
  Test: test_output_policy_table_threshold
  Given inputs `{ rows: 2, fields: 3 }`, `{ rows: 3, fields: 2 }`, and `{ rows: 3, fields: 3 }`
  When the policy is computed for each input
  Then the first two results have `table === false` and the third has `table === true`
  And the at-threshold input `{ rows: 3, fields: 3, tasks: 1 }` still has `diagram === false`
  And all results keep `prose === true` and `statusTokens === true`

Scenario: mandatory close-out table wins regardless of size
  Test: test_output_policy_mandatory_table
  Given input `{ artifact: 'closeout-next-moves', rows: 0, fields: 0 }`
  When the policy is computed
  Then `table === true` even though rows and fields are below the numeric threshold
  And `prose === true`, `statusTokens === true`, and `diagram === false`
  And the result has no field that substitutes an image for the text table

Scenario: shapes that earn a diagram, and shapes that do not
  Test: test_output_policy_diagram_triggers
  Given inputs `{ tasks: 4 }`, `{ tasks: 3, dependencies: 2, waves: 2 }`, `{ components: 3, links: 1 }` expecting `diagram === false`
  And inputs `{ tasks: 4, dependencies: 2 }`, `{ tasks: 4, waves: 2 }`, `{ tasks: 4, statusMix: 2 }`, `{ fixLoop: true }`, `{ stateMachine: true }`, `{ components: 3, links: 2 }` expecting `diagram === true`
  When the policy is computed for every input in the matrix
  Then each result's `diagram` boolean matches its listed expectation
  And every result still has `prose === true` and `statusTokens === true`
  And for `{ rows: 3, fields: 3, tasks: 4, dependencies: 2, components: 3, links: 2 }` both `table` and `diagram` are `true`

Scenario: image-only output is rejected
  Test: test_output_policy_never_image_only
  Given an input requesting an image-only surface: `{ imageOnly: true, tasks: 4, dependencies: 2, rows: 3, fields: 3, artifact: 'closeout-next-moves' }`
  When the policy is computed
  Then `prose === true`, `statusTokens === true`, `table === true`, and `diagram === true`
  And the result has no `imageOnly`, `image`, `path`, or `render` key and every key's value is a boolean
  And a frozen copy of the same input yields a deep-equal result without mutation
  And reading `scripts/output-policy.mjs` shows no judge/TypeLLM call and no filesystem or network I/O in the decision path
