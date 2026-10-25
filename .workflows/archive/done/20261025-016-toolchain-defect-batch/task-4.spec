spec: task
name: "pi-workflows-toolchain-adoption"
tags: []
---

## Intent

Adopt the upgraded toolchain in pi-workflows after the fork (agent-spec 1.5.0) and tdd-guard (0.1.1) land: reinstall the binaries, sweep the canonical verify invocations to carry `--tests <dir>`, record the removal of the accepted-limitation notes that the fixes eliminate, bump pi-workflows 0.8.0 → 0.8.1.

## Decisions

- Reinstall: `cargo install --path /home/aurel/Documents/vibe/coding-agent/agent-spec` (fork 1.5.0) and `npm link` from the tdd-guard clone — orchestrator-executable, owner-approved by this plan.
- Canonical verify: every reviewer/dispatch/skill invocation of the gate chain carries `--tests <dir>` where the tool accepts it; the Skip-only and parser-quirk accepted-limitation notes are replaced by the fixed behavior (notes removed ONLY where the fix eliminates the defect class).
- Version: pi-workflows 0.8.0 → 0.8.1; CHANGELOG entry `2026-10-25 — v0.8.1: toolchain upgrade — verifier port, guard scoping, lint parser fix`.
- The auto-gate hook (landed v0.8.0) needs no code change: with the verifier present, lifecycle binds and Skip-only stops occurring.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json
- agents/reviewer.md
- agents/dispatch-shapes.md
- skills/add-feature/SKILL.md
- skills/fix/SKILL.md
- skills/refactor/SKILL.md
- skills/plan/SKILL.md

### Forbidden
- Do not touch `extensions/index.ts` or `tests/**` (no code change required — the hook consumes the upgraded binaries).
- Do not remove the Skip-only handling code path (it stays as the documented degradation for repos without the verifier).

## Completion Criteria

Scenario: canonical verify carries the tests directory
  Test: canonical verify carries the tests directory
  Given the reviewer, dispatch shapes, and add-feature skill after the change
  When the tdd-gate invocations are inspected
  Then each carries `--tests <dir>` matching the repo layout

Scenario: accepted-limitation notes removed where fixed
  Test: accepted limitation notes removed where fixed
  Given the same files
  When the Skip-only and parser-quirk limitation notes are inspected
  Then notes whose defect class is fixed by the toolchain upgrade are gone
  And the degradation rule (tdd-gate absent ⇒ legacy shape) remains

Scenario: version and changelog updated
  Test: version and changelog updated
  Given package.json and CHANGELOG.md after the change
  When both are read
  Then version is 0.8.1
  And the head entry is dated 2026-10-25 titled v0.8.1 toolchain upgrade
