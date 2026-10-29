spec: task
name: "profile-init-generation"
tags: []
---

## Intent

Wire profile generation into `/init`: Phase 5 (the WIRE step — charter, context, README, handoff) gains the profile step — greenfield: fill `.workflows/profile.json` from the Phase 1–4 interview facts; brownfield: `init --adopt` derives the draft from build manifests (`Cargo.toml` / `package.json` / `pyproject.toml`) and the dir tree, presented for owner correction; then `bash scripts/profile-lint.sh .workflows/profile.json` — a lint failure blocks the handoff (same rule as agents-lint).

## Decisions

- WIRE step order: agents-md (existing step 1) → profile step (generate or adopt-draft → owner correction → lint) → CONTEXT/README → handoff. The profile step cites the lint by path and states the blocking rule.
- Adopt mode text: read the build manifests for test/lint/build commands, list top-level dirs as tree-domain candidates, draft the profile, show it to the owner for correction, then lint.
- The skill's handoff line mentions the profile as part of what a fresh project carries.

## Boundaries

### Allowed Changes
- skills/init/SKILL.md

### Forbidden
- Do not touch `scripts/**`, `templates/**`, `extensions/**`, CHANGELOG/package.json (TASK 3 scope).

## Completion Criteria

Scenario: wire step names the profile
  Test: grep -q "profile.json" skills/init/SKILL.md
  Given skills/init/SKILL.md after the change
  When the Phase 5 WIRE step is inspected
  Then it names .workflows/profile.json as a generated artifact

Scenario: adopt mode present
  Test: grep -q -- "--adopt" skills/init/SKILL.md
  Given the WIRE step after the change
  When its text is inspected
  Then the brownfield adopt derivation (build manifests + tree, owner correction) appears

Scenario: lint failure blocks
  Test: grep -q "profile-lint" skills/init/SKILL.md && grep -qi "block" skills/init/SKILL.md
  Given the WIRE step after the change
  When its text is inspected
  Then profile-lint is invoked by path and its failure blocks the handoff
