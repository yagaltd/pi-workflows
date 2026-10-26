spec: task
name: "closeout-next-moves-gate"
tags: [closeout, queue, decision-brief]
max-rounds: 2
---

## Intent

`closeout.mjs` renders the `### Next moves` table from
`.workflows/queue.json` (rows: option, what, effort, risk, unblocks,
recommend) and the settle judge gains a fifth question checking the table.

## Decisions

- `--queue <file>` flag (default `.workflows/queue.json`); missing file
  renders a loud no-queue line, never silence.
- Settle question five: `decision_brief_present` — every open item carries
  all six columns. Advisory as before.

## Boundaries

### Allowed Changes
- scripts/closeout.mjs
- tests/closeout-queue.test.ts

### Forbidden
- scripts/judge.mjs, .workflows/queue.json (task-3 seeds it), prompts/, README.md

## Completion Criteria

Scenario: closeout renders next moves table from queue.json
  Test: closeout renders next moves table from queue.json
  Then a queue fixture renders a six-column table with one row per option and a missing file renders the loud line

Scenario: settle judge checks the decision brief columns
  Test: settle judge checks the decision brief columns
  Then a stubbed no on decision_brief_present yields a finding naming it
