spec: task
name: "Trust extension — spec-sanity replay prototype"
tags: [prototype, jev, typesafe, spec-sanity]
max-rounds: 3
verify: test -f .workflows/spikes/spec-sanity/report-skeleton.md
---

## Intent

Bounded question: **do the 3 spec-sanity Noul shapes (boundaries_specific / selectors_runnable / verify_literal) separate T5-class bad selectors from good specs?** Build the replay corpus + request payloads + merge tooling under `.workflows/spikes/spec-sanity/`; the orchestrator executes the live typesafe_evaluate batches (phase B) and the merged report proposes thresholds + GO/NO-GO. Zero production files.

## Decisions

- Question shapes VERBATIM from the proposal: per spec-fragment state, 3 Noul — `boundaries_specific` ("Is every path in Allowed Changes an exact path or glob, rather than a description?"), `selectors_runnable` ("Would every Test: selector, run as literally written after the task completes, execute without shell errors and be capable of matching?"), `verify_literal` ("Is the Verify line a literal command line, not a description of what to do?").
- State = spec text verbatim (+ the repo paths it names, as text); ground truth NEVER in state.
- Negatives (ground-truth false): T5's two pre-amendment selectors, quoted verbatim from `archive/done/20260919-010-code-contracts/reviews/task-5.md` (the `-A6` window selector and the `= 1` count selector), each as a minimal spec-fragment; plus any plan-040 negatives recoverable from `archive/done/` (skip cleanly if not locatable — record the attempt).
- Positives (ground-truth true): the 7 shipped specs of plan-010 (archive) + archived 001/003 specs.
- `merge.py` self-tested (perfect-agreement + mixed synthetic) BEFORE the live run; per-question accuracy + confusion + threshold proposal with FP/FN tradeoff in plain numbers.
- Jev calls are ORCHESTRATOR-side (7p pattern): the child builds payloads and ends with "PHASE-A READY" + requests path; never calls typesafe itself.

## Boundaries

### Allowed Changes
- .workflows/spikes/spec-sanity/**

### Forbidden
- everything else — no production files

## Completion Criteria

Scenario: Spike artifacts exist
  Test: test -f .workflows/spikes/spec-sanity/report-skeleton.md && test -d .workflows/spikes/spec-sanity/requests
  Given phase A
  When it completes
  Then skeleton report, corpus.md, requests/, expected.json, merge.py all exist

Scenario: Negatives verbatim from the verdict file
  Test: grep -F "A6" .workflows/spikes/spec-sanity/corpus.md && grep -F "= \"1\"" .workflows/spikes/spec-sanity/corpus.md
  Given reviews/task-5.md documents both original selectors
  When the corpus is built
  Then both T5 fragments appear with their ground truth marked false

Scenario: No ground-truth leak in payloads
  Test: bash -c '! grep -rl "expected\|ground.truth\|false\"" .workflows/spikes/spec-sanity/requests/'
  Given the leak discipline from the 7p spike
  When payloads are inspected
  Then request state carries no ground-truth markers

Scenario: Negative — zero production files
  Test: bash -c 'git status --porcelain | grep -vE "^\?\? \.workflows/" | wc -l | grep -qx 0'
  Given spike discipline
  When git status runs at repo root
  Then nothing outside .workflows/ changed
