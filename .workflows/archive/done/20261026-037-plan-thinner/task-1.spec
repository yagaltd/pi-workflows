spec: task
name: "plan-thinner-skill-authority"
tags: []
---

## Intent

Make `skills/plan/SKILL.md` the sole flow authority for `/plan`: the prompt-unique content (the judge pre-flight steps from plan 20261025-017 T2, the PROPOSAL-FORMAT draft-guidance pointer from plan 20261025-018 T2) MOVES into the SKILL, and `prompts/plan.md` shrinks to a thin entry (frontmatter + pointer + load-and-execute). No behavior change — the flow's steps, order, and gates are identical; only their home moves. Target ≤ 25 prompt lines.

## Decisions

- Move-first, shrink-second: the SKILL carries the moved sections BEFORE the prompt shrinks; the contract greps pin the moved content IN THE SKILL.
- The judge pre-flight steps merge into the SKILL's Phase 5 section (after contract generation): per-contract question file, `node scripts/judge.mjs ask --questions <preflight.json> --audit .workflows/reviews/judge-<plan-id>.md`, findings → drafter fix round, re-run, escalate remaining + low-confidence at the approval ask, `JUDGE SKIPPED` ⇒ proceed to the approval ask.
- The PROPOSAL-FORMAT pointer (proposals follow `templates/PROPOSAL-FORMAT.md` — Refactor assessment + Docs impact mandatory) lives in the SKILL's proposal-drafting guidance AND stays as the one pointer line in the thin prompt.
- The prompt keeps: frontmatter (`description` only), the pointer line, and "load `skills/plan/SKILL.md` and execute it". Nothing else.

## Boundaries

### Allowed Changes
- skills/plan/SKILL.md
- prompts/plan.md

### Forbidden
- Do not touch `extensions/**`, `scripts/**`, `agents/**`, `templates/**`, README, CHANGELOG (TASK 2 scope), other prompts, other skills.
- Do not change the flow's steps, order, or gates — home moves, content does not.
- Do not alter other skills.

## Completion Criteria

Scenario: the skill carries the judge pre-flight
  Test: grep -q "judge.mjs ask" skills/plan/SKILL.md && grep -q "JUDGE SKIPPED" skills/plan/SKILL.md && grep -q "judge-<plan-id>" skills/plan/SKILL.md
  Given skills/plan/SKILL.md after the change
  When the Phase 5 section is inspected
  Then it carries the judge pre-flight steps (per-contract question file, ask command, audit location)
  And the NO-JUDGE degradation sentence is present

Scenario: the skill carries the proposal format pointer
  Test: grep -q "PROPOSAL-FORMAT" skills/plan/SKILL.md
  Given skills/plan/SKILL.md after the change
  When the proposal-drafting guidance is inspected
  Then it names templates/PROPOSAL-FORMAT.md

Scenario: the prompt is a thin entry
  Test: test $(wc -l < prompts/plan.md) -le 25 && grep -q "PROPOSAL-FORMAT" prompts/plan.md && grep -q "skills/plan/SKILL.md" prompts/plan.md
  Given prompts/plan.md after the change
  When the file is measured and inspected
  Then it is at most 25 lines
  And it keeps the PROPOSAL-FORMAT pointer and the load-the-SKILL instruction
  And it carries no phase-flow prose
