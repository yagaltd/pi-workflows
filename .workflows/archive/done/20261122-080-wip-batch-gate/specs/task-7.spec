spec: task
name: wip-docs-mise-init
tags: [wip, docs, mise, init]
verify: "bun test tests/wip-docs.test.ts tests/mise-tasks.test.ts && bash scripts/docs-lint.sh"
max-rounds: 2
---

## Intent

Document the WIP lifecycle and add `wf:wip` to generated consumer mise
fragments. Pin the emit, consume, and block strings so docs cannot drift.

## Decisions

- `docs/architecture.md` gets the WIP lifecycle and gate surfaces.
- `docs/canon.md` places WIP state under `.workflows/wip/**`.
- `buildInitMiseFragment` adds one `wf:wip` task.
- `/init` still never edits root `mise.toml` or repo `check`/`verify`.
- CHANGELOG is written by the gate at SHIP, not by this task.

## Boundaries

### Allowed Changes
- .workflows/specs/task-7.spec
- docs/architecture.md
- docs/canon.md
- scripts/init-extract.ts
- skills/init/SKILL.md
- tests/wip-docs.test.ts
- tests/mise-tasks.test.ts

### Forbidden
- README.md
- CHANGELOG.md
- AGENTS.md
- templates/AGENTS.md
- skills/fix/SKILL.md
- skills/review/SKILL.md
- skills/refactor/SKILL.md
- scripts/wip.mjs
- scripts/check-drift.sh
- extensions/index.ts
- .githooks/**
- .mise/**

## Completion Criteria

Scenario: architecture documents the lifecycle
  Test: test_docs_architecture_wip_lifecycle
  Given docs/architecture.md
  When its WIP section is read
  Then emit, active, consume, and shipped states are documented

Scenario: canon places WIP state
  Test: test_docs_canon_wip_state
  Given docs/canon.md
  When its WIP pointer is read
  Then .workflows/wip/** is named and no new doc type is invented

Scenario: init fragment includes wf:wip
  Test: test_init_fragment_includes_wf_wip
  Given buildInitMiseFragment output
  When the fragment is parsed
  Then exactly one [tasks."wf:wip"] entry exists and calls PI_WORKFLOWS_BIN

Scenario: init never touches root config
  Test: test_init_fragment_never_edits_root_mise
  Given the generated fragment and init skill
  When their text is read
  Then no root mise.toml mutation is instructed
