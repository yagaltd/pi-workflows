spec: task
name: "execution-doctrine + dispatch-shapes — loop upgrades"
tags: [docs, doctrine, shapes, loop, tripwire, smoke]
max-rounds: 3
---

## Intent

The execution loop gains the landing tripwire, honest instrumentation semantics (lifecycle skips, union-scoped guard), the consolidated final review pattern, live smoke as a first-class layer, and cwd-carrying dispatch shapes.

## Decisions

- D6/D7 in doctrine: (a) loop diagram + rules gain the tripwire step between worker settle and ✅ persist — orchestrator runs tooling/verify-landing.sh; ALARM = phantom → worker report untrusted → redispatch with explicit per-task cwd; fake work is never reviewed. (b) Consolidated final review: when parallel waves share one worktree, wave-time agent-spec guard output is union-noise; the consolidated full-tree review at plan end is the review of record. (c) Lifecycle-skip honesty: agent-spec lifecycle scenario skips are "unverified-by-lifecycle" — a documented gap; orchestrator instructs reviewers explicitly how skips are covered (tdd-guard selectors + suite green); never silently treat as pass. (d) Live-smoke layer: UI-facing plans include a live smoke task (dev server + real browser driving); unit-green ≠ working (F1 form-persist + F2 stale-serve evidence from 20260822-002).
- D1 in shapes: every dispatch template gains `cwd: "<absolute repo path>"`; worker task-text templates open with a first line naming the absolute repo path (the GUARD anchor); fix-round and scout shapes included.
- New shape: live-smoke task (worker role, runs the product live, records observed states honestly — failures are findings, never rationalized away; evidence file under .workflows/docs/).

## Boundaries

### Allowed Changes
- agents/execution-doctrine.md
- agents/dispatch-shapes.md

### Forbidden
- Other agent files, tooling/, .workflows/, skills/, extension code

## Completion Criteria

Scenario: Tripwire in the loop
  Test: grep -c "verify-landing" agents/execution-doctrine.md
  Given the updated doctrine
  Then the loop section references the tripwire with its ALARM consequence (≥2 mentions: loop + rules or fix rounds)

Scenario: Consolidated final review pattern documented
  Test: grep -i "consolidated" agents/execution-doctrine.md
  Then the pattern (wave guard = union-noise; full-tree final review = record) is stated

Scenario: Lifecycle-skip semantics defined
  Test: grep -i "unverified-by-lifecycle\|lifecycle skip" agents/execution-doctrine.md
  Then skips are named a documented gap with the explicit-instruction rule

Scenario: Live-smoke layer present
  Test: grep -i "smoke" agents/execution-doctrine.md agents/dispatch-shapes.md
  Then doctrine names the layer (unit-green ≠ working) and shapes contain a smoke dispatch template

Scenario: Shapes carry cwd
  Test: grep -c 'cwd:' agents/dispatch-shapes.md
  Then every worker/reviewer dispatch template in the file includes cwd (≥4 occurrences across sequential, wave, fix-round, scout shapes)

Scenario: Task text opens with absolute anchor
  Test: grep -i "absolute" agents/dispatch-shapes.md
  Then worker task-text templates show the absolute-repo first line as the GUARD anchor
