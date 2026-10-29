spec: task
name: "agents-init-wiring"
tags: []
---

## Intent

Wire the landed agents-lint into the generation flow: `skills/init` Phase 5 (the WIRE step — charter, context, README skeleton, handoff) step 1 rewritten to GENERATE the project AGENTS.md from the restructured template, FILL the `<placeholder>` pointers from the Phase 1–4 facts, RUN `scripts/agents-lint.sh` on the result before the handoff — generation without validation is how mdflows happened. `templates/DOCS-POLICY.md` names the lint as the AGENTS.md enforcement gate.

## Decisions

- Phase 5 WIRE step 1 becomes: copy the template → fill `<placeholder>` pointers from Phase 1–4 facts (test command, map/ADR/registry targets) → write project binding rules into PROJECT → run `bash scripts/agents-lint.sh AGENTS.md` → a lint failure blocks the handoff.
- DOCS-POLICY's AGENTS.md section gains one line: the enforcement gate is `scripts/agents-lint.sh` (check-drift runs it on this repo; init runs it at generation).
- No other init steps change.

## Boundaries

### Allowed Changes
- skills/init/SKILL.md
- templates/DOCS-POLICY.md

### Forbidden
- Do not touch `templates/AGENTS.md`, `scripts/agents-lint.sh`, `AGENTS.md` (TASK 1 landed), `extensions/**`, `scripts/check-drift.sh`, CHANGELOG/package.json (TASK 3 scope).

## Completion Criteria

Scenario: wire step names the lint
  Test: grep -q "agents-lint.sh" skills/init/SKILL.md
  Given skills/init/SKILL.md after the change
  When the Phase 5 WIRE step is inspected
  Then it names agents-lint.sh as the generation gate

Scenario: wire step orders generate fill lint handoff
  Test: grep -q "fill" skills/init/SKILL.md && grep -q "agents-lint" skills/init/SKILL.md
  Given the Phase 5 WIRE step after the change
  When its text is inspected
  Then the order is generate, fill placeholders, lint, handoff — and a lint failure blocks the handoff

Scenario: docs policy names the gate
  Test: grep -q "agents-lint" templates/DOCS-POLICY.md
  Given templates/DOCS-POLICY.md after the change
  When the AGENTS.md section is inspected
  Then the lint is named as the enforcement gate
