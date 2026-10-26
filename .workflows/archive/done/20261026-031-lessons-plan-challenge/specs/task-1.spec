spec: task
name: "lessons-reads-in-skills"
tags: [lessons, plan, challenge, wiring]
max-rounds: 2
---

## Intent

The plan and challenge skills read the lessons ledger before drafting and
grilling: cite applied lessons, do not re-litigate active ones without a
recorded revisit-reason.

## Decisions

- /plan Phase 1 runs `node scripts/lessons.mjs list` and cites applied
  lesson ids in Execution Notes (lessons: les-<id> lines).
- /challenge Phase 1 adds the contradiction check: a plan contradicting an
  active lesson without a revisit-reason is a finding.
- Provenance trust filter: from_untrusted informs; verified blocks; failed
  warns.

## Boundaries

### Allowed Changes
- skills/plan/SKILL.md
- skills/challenge/SKILL.md

### Forbidden
- scripts/lessons.mjs, prompts/, tests/, README.md

## Completion Criteria

Scenario: plan and challenge prompts read the lessons ledger
  Test: plan and challenge prompts read the lessons ledger
  Then both skills name lessons.mjs list, the citation line, and the provenance trust filter
