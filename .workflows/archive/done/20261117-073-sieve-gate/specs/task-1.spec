spec: task
name: sieve-doctrine
tags: [doctrine, intake, sieve]
verify: "bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh"
max-rounds: 2
---

## Intent

Proposal flows answer four forced questions before any work is planned; the
outcome rules park or fast-track mechanically; decision rows carry cost of
inaction and blast radius; repo facts earn their way into doctrine.

## Decisions

- The 4-question gate lands in skills/idea/SKILL.md, skills/plan/SKILL.md,
  skills/add-feature/SKILL.md, prompts/prototype.md — identical wording,
  normative from the plan's Execution Notes (V/R/E/path forced choice, pure
  outcome rules, park = ledger row never a plan).
- Obligation flows are exempt and say so in one line (fix, debug, docs,
  verify, review answer to broken things, not value verdicts).
- skills/plan/SKILL.md: plan template gains the `## Sieve` section; decision
  rows gain `Cost of inaction:` and `Blast radius:` (+/−/neutral per target).
- agents/registry.md: knowledge-promotion rule (3 independent confirmations
  before doctrine entry; contradiction reverts).
- templates/STATUS-VOCABULARY.md: park → [[Decision]] (revive or drop);
  build-direct → [[Implement]] rows added.
- Budgets: new doctrine text follows the 072 harper-clean patterns; any
  bucket rise is offset by cleaning prose in the same file (hold-or-fall).

## Boundaries

### Allowed Changes
- skills/idea/SKILL.md
- skills/plan/SKILL.md
- skills/add-feature/SKILL.md
- prompts/prototype.md
- agents/registry.md
- templates/STATUS-VOCABULARY.md
- tests/prompt-doctrine.test.ts

### Forbidden
- A separate decision-model/judge dependency (the upgrade path is documented,
  not built)
- Changing dispatch, gates, or the extension
- Park outcome appearing as valid in a plan template

## Completion Criteria

Scenario: the gate is identical in all four proposal entries
  Test: test_sieve_gate_in_all_proposal_entries
  Given the four entry skills/prompt
  When read
  Then each carries the same 4 forced questions and the pure outcome rules

Scenario: obligations are exempt
  Test: test_obligation_flows_exempt
  Given the fix/debug/docs/verify/review skills
  When read
  Then no sieve gate was added to them

Scenario: the plan template carries the sieve section
  Test: test_plan_template_sieve_section
  Given skills/plan/SKILL.md
  When read
  Then the template includes the normative Sieve grammar with park-as-error noted

Scenario: decision rows ask the two missing questions
  Test: test_decision_rows_cost_and_blast_radius
  Given skills/plan/SKILL.md
  When read
  Then Cost of inaction and Blast radius (+/−/neutral) are required decision fields

Scenario: knowledge promotion rule
  Test: test_knowledge_promotion_rule
  Given agents/registry.md
  When read
  Then the 3-confirmation/contradiction-revert rule is present

Scenario: vocabulary covers the outcomes
  Test: test_vocabulary_covers_outcomes
  Given templates/STATUS-VOCABULARY.md
  When read
  Then park→Decision and build-direct→Implement rows exist

Scenario: gates stay green
  Test: test_gates_stay_green
  When bun test, check-drift and docs-lint run
  Then all exit 0
