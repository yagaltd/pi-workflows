spec: task
name: "doc-gate-guidance"
tags: [docs, guidance, flows, agents-charter]
verify: "bash scripts/agents-lint.sh AGENTS.md && bash scripts/check-drift.sh && grep -q 'just docs' skills/flows/SKILL.md && grep -q 'justfile' AGENTS.md"
---

## Intent

Make the doc-gate hook loop discoverable: flows SKILL documents that doc-touching tasks extend `verify` with `just docs`; AGENTS.md gains a one-liner pointer to the justfile entrypoint.

## Decisions

- Diff-scope rule lands in flows SKILL's Format/Run area: task packs whose Allowed Changes touch docs/prompts/skills/agents/README/CHANGELOG set `verify` to include `just docs` (alongside the task's own test command).
- AGENTS.md gets ONE pointer line in PROJECT (budget is 60 lines — the file stays under it; agents-lint is the gate).
- Guidance-level only — no mechanical guard in this plan (labeled assumption; revisit only if doc-drift recurs).
- No new doc files. Judge layering is already covered by agents/execution-doctrine.md — do not duplicate it.

## Boundaries

### Allowed Changes
- skills/flows/SKILL.md
- AGENTS.md

### Forbidden
- Do not modify justfile or scripts/ (T1/T3 sibling outputs)
- Do not create new doc files; do not touch README.md, docs/, templates/
- Do not modify agents/execution-doctrine.md (judge section already exists)
- Do not exceed the AGENTS.md 60-line budget

## Completion Criteria

Scenario: flows SKILL carries the verify guidance
  Test: grep -q 'just docs' skills/flows/SKILL.md
  Given skills/flows/SKILL.md after the edit
  When reading the task-field documentation
  Then the diff-scope rule is stated: doc-surface tasks include just docs in verify

Scenario: AGENTS.md points at the entrypoint
  Test: grep -q 'justfile' AGENTS.md
  Given AGENTS.md after the edit
  When reading the POINTERS or PROJECT section
  Then one line names justfile as the command entrypoint wrapping scripts/

Scenario: charter lint stays green
  Test: bash scripts/agents-lint.sh AGENTS.md
  Given the edited AGENTS.md
  When running the charter linter
  Then exit 0 — no FAIL lines (budget, pointers, placeholders all clean)

Scenario: repo-wide drift stays clean
  Test: bash scripts/check-drift.sh
  Given both edits landed
  When running the drift checker
  Then CLEAN — no drift (skill refs and registry stay consistent)

Scenario: negative — 60-line budget violation is caught, not absorbed
  Test: bash scripts/agents-lint.sh AGENTS.md; test $? -eq 0
  Given the one-liner addition
  When agents-lint checks the line budget
  Then the file passes at ≤60 lines — any overflow must be solved by trimming prose, never by skipping the lint
