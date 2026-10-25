spec: task
name: "quality-reviewer advisory Jev compliance step"
tags: [quality-reviewer, jev, typesafe, advisory]
max-rounds: 2
verify: grep -q "typesafe_evaluate" agents/quality-reviewer.md && grep -qi "advisory" agents/quality-reviewer.md
---

## Intent

Add the advisory Jev layer to the quality-reviewer (proposal step 5, unlocked by T7p GO): one batched typesafe_evaluate over the task diff — per touched contract a Noul compliance question, per governing ADR a Choice (consistent/contradicts/supersedes/unrelated). Flags surface in the report under the existing Domain/ADR-fit check; nothing is blocked; the verdict path is untouched.

## Decisions (evidence: reviews/task-7p.md + spike report)

- Advisory ONLY — flags route to the human; never in any verdict path; never blocks (7p verdict: gating forbidden until real-diff evidence).
- Thresholds carried from T7p, marked UNTESTED in the doc: noul act-flag ≥0.85 / ask 0.60–0.85; choice act ≥0.90 (7p retro split: noul 13/14/1, choice 12/3).
- Question shapes verbatim from the spike's requests/ (state = change summary + rule prose + governing decision; questions = noul_r*/choice_adr pattern).
- Skip silently when: no contracts/ADR govern the diff, or typesafe unavailable (apiKey/authState) — the check degrades to absent, like cc-check-when-absent.
- Placed under the existing Domain/ADR-fit check (#5 in the P0-P3 rubric) — no new report section authority.

## Boundaries

### Allowed Changes
- agents/quality-reviewer.md

### Forbidden
- everything else, incl. agents/reviewer.md, agents/worker.md, extensions/, tests/, templates/

## Completion Criteria

Scenario: Batched Jev step documented
  Test: grep -q "typesafe_evaluate" agents/quality-reviewer.md
  Given agents/quality-reviewer.md at HEAD
  When the edit lands
  Then the Domain/ADR-fit check documents one batched typesafe_evaluate call with the noul-per-contract + choice-per-ADR shapes

Scenario: Advisory-only rule explicit
  Test: grep -B2 -A6 "typesafe_evaluate" agents/quality-reviewer.md | grep -qi "advisory" && grep -B2 -A6 "typesafe_evaluate" agents/quality-reviewer.md | grep -qi "never"
  Given the new step
  When read
  Then it states advisory-only and that flags never gate or flip verdicts

Scenario: Thresholds present and marked untested
  Test: grep -q "0.85" agents/quality-reviewer.md && grep -q "0.90" agents/quality-reviewer.md && grep -B3 -A8 "0.85" agents/quality-reviewer.md | grep -qi "untested"
  Given the carried thresholds
  When read
  Then noul 0.85 / choice 0.90 appear with the untested marker and the re-evaluate-during-advisory note

Scenario: Skip conditions documented
  Test: grep -B2 -A10 "typesafe_evaluate" agents/quality-reviewer.md | grep -qi "skip"
  Given degradation discipline
  When no contracts govern the diff or typesafe is unavailable
  Then the step is skipped silently — documented

Scenario: Negative — verdict authority unchanged
  Test: grep -c "## Verdict" agents/quality-reviewer.md
  Given the output template
  When the edit lands
  Then the Verdict block appears exactly once and its ok:true/ok:false semantics text is not modified (diff shows no hunks inside the Verdict template block)
