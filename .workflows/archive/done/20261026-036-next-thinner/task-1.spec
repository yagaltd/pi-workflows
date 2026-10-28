spec: task
name: "dispatch-next-tool"
tags: []
---

## Intent

Register the dispatcher as a model-callable tool: `pi.registerTool("dispatch_next")`. The tool reads `.workflows/plan.md`, `agents/registry.md` (builds the registry map internally), and `.workflows/reviews/*.md`, then returns the binding `resolveNext()` result plus the wave's eligible members. Zero arguments, read-only, inert without a live plan. This removes the inline `bun -e` script and the manual registry-map build from `prompts/next.md` (the prompt rewrite is TASK 3).

## Decisions

- Registration: `pi.registerTool("dispatch_next", ...)` — the execute function calls the existing pure `resolveNext()` with inputs the tool gathers itself (plan text, registry built from `agents/registry.md`, review files, repo cwd).
- Returned payload: the dispatcher result `{ ok, task, pack, gateCommands }` plus `eligible` (from `eligibleTasks()`) for the parallelism check. No writes, no side effects.
- Inert without a live plan: returns a structured `ok: false` result (no plan), not an error.
- Reuses the existing exports (`parsePlan`, `resolveNext`, `eligibleTasks`) — no logic duplication.

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/extension.test.ts

### Forbidden
- Do not touch `prompts/**` (TASK 3 scope), `scripts/**`, `agents/**`, README, CHANGELOG (TASK 4 scope).
- Do not change the existing `tool_call` handlers (@role substitution, auto-gate, watchdogs) — separate registrations.
- Do not add dependencies.

## Completion Criteria

Scenario: registers a model-callable dispatch_next tool
  Test: registers a model callable dispatch next tool
  Given the extension loaded
  When the registered tool surface is inspected
  Then a dispatch_next tool exists and its execute function returns the dispatcher result

Scenario: returns the binding dispatcher result
  Test: returns the binding dispatcher result
  Given a fixture plan with one eligible task
  When dispatch_next executes
  Then the result carries ok true, the task, the pack, and gateCommands
  And the pack places the shared prefix before per-task divergence

Scenario: builds the registry map internally
  Test: builds the registry map internally
  Given a fixture agents/registry.md with tier and bottleneck-tag rows
  When dispatch_next executes for a fixture task
  Then the policy (model, thinking, role) comes from the registry map — no caller-supplied registry

Scenario: is inert without a live plan
  Test: is inert without a live plan
  Given no .workflows/plan.md in the project
  When dispatch_next executes
  Then the result is a structured ok false (no plan) — not an error, not a crash
