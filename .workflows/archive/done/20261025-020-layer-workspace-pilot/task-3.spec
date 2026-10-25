spec: task
name: "layerfs-pilot-report"
tags: []
---

## Intent

Compose the pilot report (plan 20261025-020 D3/D5): `.workflows/reviews/layerfs-pilot.md` — the measured numbers (TASK 1), the integration feasibility (TASK 2), and the GO/NO-GO verdict against the four D3 criteria. NO-GO default: any criterion unmet or unmeasurable ⇒ NO-GO, backlog item 9 (the LayerFS pilot: LayerFS as worktree backend for write children — measure setup latency + disk vs git worktrees) closes with this report and the git contract stays.

## Decisions

- Report structure: (1) measured table (both backends, all axes, environment notes); (2) feasibility summary (shapes + effort + recommended path); (3) criteria scorecard (each of the four D3 criteria: met/unmet/unmeasurable + the number); (4) verdict: GO or NO-GO with the citation; (5) next step (GO ⇒ separate integration plan; NO-GO ⇒ item 9 closes).
- The verdict cites numbers, never narrative. Unmeasurable = NO-GO for that criterion.
- No version bump, no CHANGELOG entry (no product change — the report is the deliverable).

## Boundaries

### Allowed Changes
- .workflows/reviews/layerfs-pilot.md

### Forbidden
- Do not modify the bench harness, the feasibility file, or any production file.
- Do not override the D3 criteria or the NO-GO default.

## Completion Criteria

Scenario: report cites both measurement sources
  Test: grep -q "layerfs-bench" .workflows/reviews/layerfs-pilot.md && grep -q "layerfs-feasibility" .workflows/reviews/layerfs-pilot.md
  Given TASK 1 and TASK 2 outputs
  When the report is inspected
  Then it cites the bench results file and the feasibility file by name

Scenario: criteria scorecard covers all four
  Test: grep -qE "criterion [1234]" .workflows/reviews/layerfs-pilot.md
  Given the four D3 criteria
  When the scorecard is inspected
  Then each criterion carries met/unmet/unmeasurable with its number

Scenario: verdict present
  Test: grep -qE "^.*GO/NO-GO verdict:.*(GO|NO-GO)" .workflows/reviews/layerfs-pilot.md
  Given the completed scorecard
  When the verdict section is inspected
  Then a single GO or NO-GO verdict is stated with the citation
