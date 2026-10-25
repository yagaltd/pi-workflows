spec: task
name: "auto-gate-hook"
tags: []
---

## Intent

Move test-quality and contract enforcement to write time: the pi-workflows extension intercepts code-file edit/write tool calls inside an active `.workflows/` change and runs the gate chain — Layer 1 (agent-spec checks: contract, lifecycle, guard) then Layer 2 (test-quality checks: tdd-gate gaming/drift on the touched spec) — blocking the write on violation with the command output and a fix hint. Toolchain absent ⇒ one-line loud advisory per file (deduped), write allowed. Docs-only `.md` writes skip the hook entirely.

## Decisions

- Interception: the extension's existing tool_call event gains edit/write handling — only for files inside Allowed Changes of a live plan's specs, only when `.workflows/plan.md` exists (no live plan ⇒ hook inert).
- Ordered run, short-circuit on first failure: `agent-spec guard` (boundary, scoped to the touched spec via per-task spec-dir) → `agent-spec lifecycle --format json` → `tdd-gate gaming --diff` + `tdd-gate drift --spec`. Each layer's verdict parsed from JSON/text output.
- Block semantics: `block: true` with reason = failing layer + command + first findings line. Advisory semantics (toolchain absent): `block: false` + one-line advisory, deduped per file via the existing watchdog pattern.
- Docs exemption: `*.md` writes never trigger the chain (docs enforcement is the doc-drift gate's scope, separate backlog item).
- Extension stays small: the gate runner lives in the extension, reuses the existing `runCapture` helper, no new dependencies.

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/extension.test.ts

### Forbidden
- Do not touch `agents/**`, `skills/**`, `prompts/**`, `scripts/dispatch-ledger.mjs` (TASK 2 scope), README, CHANGELOG (TASK 4 scope).
- Do not change watchdog trigger conditions or the supersede advisory text.
- Do not add dependencies.

## Completion Criteria

Scenario: blocks a code write that violates contract boundaries
  Test: blocks a code write that violates contract boundaries
  Given a live plan whose spec allows only src/**
  When an edit writes to a path outside Allowed Changes
  Then the tool call is blocked
  And the block reason names the boundary violation

Scenario: blocks when a lifecycle scenario fails
  Test: blocks when a lifecycle scenario fails
  Given a live plan with a spec whose scenario fails against the current tree
  When an edit to an Allowed file completes
  Then the tool call is blocked
  And the block reason carries the failing layer name and first findings line

Scenario: advises and allows when the toolchain is absent
  Test: advises and allows when the toolchain is absent
  Given agent-spec is not on PATH
  When an edit to an Allowed file completes
  Then the write proceeds
  And exactly one advisory per file names the missing toolchain

Scenario: skips docs-only markdown writes
  Test: skips docs only markdown writes
  Given a live plan in progress
  When a write touches only a .md file outside spec dirs
  Then no gate commands run
  And no advisory is emitted for that write
