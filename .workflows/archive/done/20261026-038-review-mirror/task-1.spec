spec: task
name: "review-skill-extraction"
tags: []
---

## Intent

Extract the `/review` flow into `skills/review/SKILL.md` (new — the last major command without a SKILL) and shrink `prompts/review.md` to a thin entry (≤ 30 lines). The SKILL carries the full flow verbatim-in-meaning: Stage 0 risk-scoping (fast/full path), Stage 1 mechanical verification, Stage 2 adversarial + quality review, Stage 3 SHIP (incl. the `check-archive.sh` gate), Combined Output format. No behavior change — stages, order, gates identical; only the home moves. This is a one-time extraction (no mirror to diverge).

## Decisions

- Move-first, extract-second: the SKILL carries the complete flow before the prompt shrinks; the contract greps pin the stages IN THE SKILL.
- The `check-archive.sh` SHIP gate line moves with Stage 3 — zero behavior change.
- The prompt keeps: frontmatter (`description` only), and "load `skills/review/SKILL.md` and execute it". No stage prose, no Combined Output format.
- Self-contained extraction: no new `references/` dirs in the SKILL (check-drift section 3b).

## Boundaries

### Allowed Changes
- skills/review/SKILL.md
- prompts/review.md
- tests/chooser-wiring.test.ts
- tests/closeout-wiring.test.ts
- tests/decisions-docs.test.ts
- tests/lessons-docs.test.ts
- tests/ship-wiring.test.ts

> AMENDMENT A (orchestrator, 2026-10-26, on record in LOG): the 5 wiring-test read-targets re-pointed prompts/review.md → skills/review/SKILL.md per the approved D1 extraction (plan-037 precedent: tests assert on the surface where the content lives). Necessity + minimality proven by the R1 reviewer.

### Forbidden
- Do not touch `extensions/**`, `scripts/**`, `agents/**`, other `skills/**`, README, CHANGELOG (TASK 2 scope), `templates/**`.
- Do not change the flow's stages, order, or gates — home moves, content does not.
- Do not add dependencies.

## Completion Criteria

Scenario: the SKILL carries all review stages
  Test: grep -q "Stage 0" skills/review/SKILL.md && grep -q "Stage 1" skills/review/SKILL.md && grep -q "Stage 2" skills/review/SKILL.md && grep -q "Stage 3" skills/review/SKILL.md && grep -q "check-archive.sh" skills/review/SKILL.md
  Given skills/review/SKILL.md after the change
  When its sections are inspected
  Then all four stages and the check-archive gate appear

Scenario: the prompt is a thin entry
  Test: test $(wc -l < prompts/review.md) -le 30 && grep -q "skills/review/SKILL.md" prompts/review.md
  Given prompts/review.md after the change
  When the file is measured and inspected
  Then it is at most 30 lines
  And it carries the load-the-SKILL instruction
  And it carries no stage prose

Scenario: fast and full path rules preserved
  Test: grep -q "Fast path" skills/review/SKILL.md && grep -q "Full path" skills/review/SKILL.md
  Given skills/review/SKILL.md after the change
  When the Stage 0 scope section is inspected
  Then the fast/full path rules appear
