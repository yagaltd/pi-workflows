spec: task
name: "guard-per-spec-scoping"
tags: [agent-spec, guard, review]
verify: "bash -n scripts/flow-gates.mjs && ! grep -qF 'guard --spec-dir .workflows/specs --code .' scripts/flow-gates.mjs && grep -q 'guard' prompts/verify.md"
---

## Intent

Kill the multi-spec guard false-positive (absolute-vs-relative boundary paths flag in-scope files mid-plan) by scoping guard to one spec at our call sites: the flow-gates contract gate and the verify prompt.

## Decisions

- Probe `agent-spec guard --help` first; use the documented single-spec form. If only --spec-dir exists, loop per spec (one invocation per .spec file) and aggregate.
- Call sites to change: scripts/flow-gates.mjs (contract gate) and prompts/verify.md (Layer 1 command block). Upstream agent-spec binary untouched.
- The review skill keeps its guard guidance unchanged (T4 owns prose there; no overlap).
- Aggregate exit rule: any single-spec failure fails the aggregate; a skip-only lifecycle verdict inside guard is reported, not swallowed.

## Boundaries

### Allowed Changes
- scripts/flow-gates.mjs
- prompts/verify.md

### Forbidden
- Do not modify the agent-spec binary or add dependencies
- Do not touch skills/review/SKILL.md, tests/, templates/
- Do not weaken the gate: real boundary violations must still fail the aggregate

## Completion Criteria

Scenario: old multi-spec form is gone from the gate
  Test: ! grep -qF 'guard --spec-dir .workflows/specs --code .' scripts/flow-gates.mjs && grep -q 'agent-spec guard' scripts/flow-gates.mjs
  Given flow-gates.mjs after the edit
  When inspecting the contract gate command
  Then the bare multi-spec one-liner is gone and guard is still invoked (per-spec form)

Scenario: verify prompt carries the scoped form
  Test: grep -q 'agent-spec guard' prompts/verify.md && ! grep -qF 'guard --spec-dir .workflows/specs --code . --change-scope worktree --format json' prompts/verify.md
  Given prompts/verify.md after the edit
  When reading the Layer 1 block
  Then the guard command is the per-spec scoped form

Scenario: gate script still parses
  Test: bash -n scripts/flow-gates.mjs
  Given the edited resolver
  When bash -n parses it
  Then exit 0

Scenario: real violation still caught (negative)
  Test: d=$(mktemp -d) && printf 'spec: task\nname: "probe"\ntags: []\n---\n\n## Intent\nx\n\n## Boundaries\n\n### Allowed Changes\n- nope/does-not-exist.md\n\n### Forbidden\n- nothing\n\n## Completion Criteria\n\nScenario: s\n  Test: true\n  Given g\n  When w\n  Then t\n' > $d/probe.spec && agent-spec guard --spec-dir $d --code . >/dev/null 2>&1; ec=$?; rm -rf $d; test $ec -ne 0
  Given a probe spec whose Allowed path matches nothing changed
  When guard runs scoped to it
  Then exit non-zero — the scoped form still fails real violations

Scenario: false-positive gone on merged specs (positive)
  Test: d=$(mktemp -d) && cp .workflows/specs/task-2.spec $d/ && agent-spec guard --spec-dir $d --code . >/dev/null 2>&1; ec=$?; rm -rf $d; test $ec -eq 0
  Given a single-spec dir whose task is merged with boundaries respected
  When guard runs scoped to it
  Then exit 0 — the mid-plan absolute/relative flag does not reproduce in single-spec mode
