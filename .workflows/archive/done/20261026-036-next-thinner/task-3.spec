spec: task
name: "thin-prompt-rewrite"
tags: []
---

## Intent

Rewrite `prompts/next.md` and `prompts/auto-next.md` as thin triggers over the landed tool + automation: call `dispatch_next` (binding result), dispatch per `agents/dispatch-shapes.md`, gate per `agents/execution-doctrine.md`, handle the named exceptions. The inline `bun -e` script, the manual registry-map build, and the proof/journal/compaction steps are GONE (all moved to the extension in TASK 1/TASK 2). Target ≤ 45 lines each; frontmatter unchanged.

## Decisions

- `prompts/next.md` structure: role statement (orchestrator, never implements) → call `dispatch_next` → the result is binding (send `pack` verbatim, `gateCommands` is the gate list) → dispatch per the shapes → gate per the doctrine → exceptions (BLOCKED reasons, NEEDS_CONTEXT, parallelism confirmation). Nothing else.
- `prompts/auto-next.md` = the same core + the loop (re-call until `no-pending`) + the budget check before each re-run. The duplicated dispatcher section is deleted.
- NO-JUDGE and record-script degradation notes move out — the extension owns the degradation paths now; the prompts stay silent about them.
- Frontmatter keys unchanged (`description` only) — check-drift sections 1 and 7 keep passing.

## Boundaries

### Allowed Changes
- prompts/next.md
- prompts/auto-next.md

### Forbidden
- Do not touch `extensions/**` (TASK 1/TASK 2 landed), `scripts/**`, `agents/**`, `skills/**`, README, CHANGELOG (TASK 4 scope).
- Do not re-introduce task-selection, wave-discipline, registry-build, or record-step prose.

## Completion Criteria

Scenario: prompts call the dispatch_next tool
  Test: grep -q "dispatch_next" prompts/next.md && grep -q "dispatch_next" prompts/auto-next.md
  Given both prompts after the change
  When their content is inspected
  Then both instruct calling the dispatch_next tool and treating the result as binding

Scenario: no inline dispatcher script remains
  Test: ! grep -q "bun -e" prompts/next.md && ! grep -q "bun -e" prompts/auto-next.md
  Given both prompts after the change
  When they are searched
  Then no bun -e invocation remains

Scenario: no manual registry prose remains
  Test: ! grep -qi "registry map" prompts/next.md && ! grep -qi "registry map" prompts/auto-next.md
  Given both prompts after the change
  When they are searched
  Then no registry-map build instruction remains

Scenario: records moved out of the prompts
  Test: ! grep -qE "proof-ledger record|run-journal record" prompts/next.md && ! grep -qE "proof-ledger record|run-journal record" prompts/auto-next.md
  Given both prompts after the change
  When they are searched
  Then no proof-ledger or run-journal record step remains

Scenario: line bounds hold
  Test: test $(wc -l < prompts/next.md) -le 45 && test $(wc -l < prompts/auto-next.md) -le 45
  Given both prompts after the change
  When line counts are measured
  Then each file is at most 45 lines

Scenario: auto-next keeps the loop and budget check
  Test: grep -qi "budget" prompts/auto-next.md && grep -qi "no-pending" prompts/auto-next.md
  Given prompts/auto-next.md after the change
  When its content is inspected
  Then the loop-until-no-pending rule and the per-rerun budget check appear
