spec: task
name: "Jev trust test — verdict replay prototype"
tags: [prototype, jev, typesafe, trust-test]
max-rounds: 3
verify: test -f .workflows/spikes/jev-trust/report.md
---

## Intent

Bounded question: **do Jev's answers on @cc-compliance and ADR-consistency question shapes agree with what actually happened?** Replay ≥10 old tasks (verdict files from `.workflows/reviews/` and `.workflows/archive/**/reviews/`) through the step-5 question shapes via `typesafe_evaluate`; record per-question correctness against the recorded outcome; propose advisory thresholds. Output: GO or NO-GO with numbers. POC lives in `.workflows/spikes/jev-trust/**` — zero production files.

## Decisions

- Question shapes match the approved proposal step 5: per contract a Noul ("does this code satisfy this rule?"), per governing ADR a Choice (consistent / contradicts / supersedes / unrelated).
- Replay corpus: real verdict files only; ground truth = the recorded ok/false outcome + findings, never re-judged by a chat model.
- Jev is called ONLY via the typesafe_evaluate tool (already enabled in the orchestrating session; the worker child may instead write a replay script the orchestrator runs, or call the tool if available — either path is valid, state which was used).
- Numbers required: per-question correctness (agreement %), confidence-vs-correctness calibration note, and a proposed act-below/ask-above threshold pair with its false-positive/false-negative tradeoff stated in plain numbers.
- GO/NO-GO is about TRUST, not about the feature: NO-GO = Jev stays dormant, plan ships steps 1–4, spike archived as evidence.

## Boundaries

### Allowed Changes
- .workflows/spikes/jev-trust/**

### Forbidden
- everything else — no production files, no agents/, templates/, skills/, extensions/ edits

## Completion Criteria

Scenario: Spike artifact exists
  Test: test -f .workflows/spikes/jev-trust/report.md
  Given the prototype work
  When it completes
  Then a report exists at the spike path with replay method, corpus list, and results

Scenario: At least 10 replays with per-question table
  Test: bash -c 'grep -Eq "(replays|corpus|tasks):[^0-9]*([1-9][0-9]+|10)" .workflows/spikes/jev-trust/report.md || [ "$(grep -cE "^\| " .workflows/spikes/jev-trust/report.md)" -ge 10 ]'
  Given the report
  When read
  Then it documents ≥10 replayed tasks and a per-question results table (question id, Jev answer, ground truth, agree?)

Scenario: Thresholds proposed with tradeoffs
  Test: bash -c 'grep -qi "threshold" .workflows/spikes/jev-trust/report.md && grep -Eq "[0-9]+(\.[0-9]+)?%" .workflows/spikes/jev-trust/report.md'
  Given the accuracy numbers
  When thresholds are chosen
  Then the report proposes act/ask thresholds and states the false-positive vs false-negative tradeoff in numbers

Scenario: GO or NO-GO verdict with citations
  Test: bash -c 'grep -Eq "GO|NO-GO" .workflows/spikes/jev-trust/report.md && grep -Eq "file:line|\.md:[0-9]+|verdict" .workflows/spikes/jev-trust/report.md'
  Given all evidence
  When the bounded question is answered
  Then the report ends with GO or NO-GO, every claim citing a file:line or verdict-file path

Scenario: Negative — zero production files touched
  Test: bash -c 'git status --porcelain | grep -vE "^\?\? \.workflows/(spikes/)?|^.M \.workflows/(LOG|plan|CONTEXT)" | wc -l | grep -qx 0'
  Given the spike directory discipline
  When git status runs at repo root
  Then nothing outside .workflows/spikes/jev-trust/ and the bookkeeping whitelist changed
