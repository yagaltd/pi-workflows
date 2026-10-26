spec: task
name: "chooser-wiring-markmap-retirement"
tags: [chooser, wiring, markmap, release]
max-rounds: 2
---

## Intent

Wire the chooser at the four boundaries, retire markmap, drop E from the
queue, record DEC-005, release v0.12.0.

## Decisions

- review Stage 3, plan Phase 4, challenge Phase 5, brainstorm graduation:
  run the chooser on the rendered output; visual pick ⇒ generate via
  diagram-design doctrine; none ⇒ state prose stands. Overrule needs a
  stated reason. HTML artifacts are generated views — never gates,
  regenerable.
- Brainstorm: ledger stays markdown; markmap tooling rules removed;
  concept views via diagram-design at graduation.
- Queue: E row dropped (owner cancelled); empty queue valid.

## Boundaries

### Allowed Changes
- prompts/review.md
- skills/plan/SKILL.md
- skills/challenge/SKILL.md
- skills/brainstorm/SKILL.md
- skills/brainstorm/references/ledger-format.md
- prompts/brainstorm.md
- README.md
- CHANGELOG.md
- package.json
- .workflows/queue.json
- .workflows/decisions/
- tests/chooser-wiring.test.ts

### Forbidden
- scripts/ (task-1 owns)

## Completion Criteria

Scenario: boundaries carry the chooser step and the view rules
  Test: boundaries carry the chooser step and the view rules
  Then all four surfaces name format-chooser.mjs, the overrule rule, and the generated-view rule

Scenario: markmap is retired from brainstorm surfaces
  Test: markmap is retired from brainstorm surfaces
  Then no markmap tooling rules remain in brainstorm skill, reference, or prompt; the ledger stays markdown

Scenario: queue drops the cancelled e row and may be empty
  Test: queue drops the cancelled e row and may be empty
  Then no E row exists and the queue file either is empty or carries full-column rows
