spec: task
name: "review-pii-pass-integration"
tags: [docs, review, advisory]
verify: "grep -q 'pii-scan' skills/review/SKILL.md && bash scripts/check-drift.sh"
---

## Intent

One line in /review Stage 2: optional judge PII advisory pass (`node scripts/pii-scan.mjs --plan <id>`) on changed data/doc files; findings → close-out Watch section; `JUDGE SKIPPED` = documented gap, findings route to the human. No gate semantics.

## Decisions

- Placement: Stage 2, alongside the bug-hunter scan step — advisory tools documented together.
- Wording names: advisory only, values never sent, findings route to the human.

## Boundaries

### Allowed Changes
- skills/review/SKILL.md

### Forbidden
- Do not modify scripts/, tests/, templates/, AGENTS.md
- Do not add gate semantics anywhere

## Completion Criteria

Scenario: Stage 2 documents the advisory pass
  Test: pii-scan advisory pass documented
  Given skills/review/SKILL.md after the edit
  When reading Stage 2
  Then one line documents the optional pii-scan pass (advisory, values never sent, findings → Watch, JUDGE SKIPPED = documented gap)

Scenario: drift stays clean
  Test: bash scripts/check-drift.sh
  Given the edited SKILL.md
  When check-drift runs
  Then CLEAN
