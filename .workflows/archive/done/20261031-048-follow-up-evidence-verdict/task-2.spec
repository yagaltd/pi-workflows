spec: task
name: "evidence-gate-integration"
tags: [proofs, verdict, flow-gates, integration]
verify: "node --check scripts/flow-gates.mjs && grep -q 'evidence' scripts/flow-gates.mjs && grep -q -- '--runner reviewer' prompts/verify.md && grep -q 'repo-faithful' skills/review/SKILL.md"
---

## Intent

Wire TASK 1's verdict functions into the review flow: an `evidence` gate in flow-gates that fails a task whose proofs are owner-only or all-not_replayable, reviewer probes recorded as proofs (`--runner reviewer`), and one documentation line. Origin note (kwant missions/foundry) goes in the proof-ledger header.

## Decisions

- flow-gates gains gate name `evidence`: reads the task's proofs from `.workflows/proofs/proofs.jsonl`, maps rows to checks (`runner`, `status` from exit + replay flag, `replayable`), runs the ported `evidenceVerdict(<task owner>, checks)`; `not_independent` / `not_checked` → gate FAIL with that reason; `passed` → pass. Task owner = the worker (dispatcher-recorded; for plan 048 integration, `worker`).
- Rows without `runner` read as `worker` (historical, per TASK 1).
- prompts/verify.md Layer 1 gains: the reviewer records each probe as `node scripts/proof-ledger.mjs record --plan <id> --task <t> --runner reviewer --kind replayable --verify "<probe>"` (not_replayable for prose/one-shot checks).
- skills/review/SKILL.md gains one line in Stage 1: the evidence verdict is computed from recorded proofs — reviewer probes must be recorded proofs, not prose claims.
- proof-ledger header comment gains the origin note: independence + replayable-kind rules ported from kwant (src/server/missions/mod.rs:359, foundry.rs:636).

## Boundaries

### Allowed Changes
- scripts/flow-gates.mjs
- prompts/verify.md
- skills/review/SKILL.md

### Forbidden
- Do not modify scripts/proof-ledger.mjs or tests/ (TASK 1 owns them)
- Do not modify agent-spec binary or .workflows/proofs/ live data
- Do not change other gate names or their semantics
- Do not alter review stage order or the approval gate

## Completion Criteria

Scenario: evidence gate passes an independent replayable ledger
  Test: evidence gate passes an independent replayable ledger
  Given a fixture ledger with one owner-run failed-free proof and one reviewer-run passed replayable proof
  When the evidence gate evaluates the task
  Then gate status pass

Scenario: evidence gate fails owner-only ledgers
  Test: evidence gate fails owner-only ledgers
  Given a fixture ledger where every proof row is owner-run
  When the evidence gate evaluates the task
  Then gate status fail with reason containing not_independent

Scenario: evidence gate fails all-not_replayable ledgers
  Test: evidence gate fails all-not_replayable ledgers
  Given a fixture ledger where every row is not_replayable
  When the evidence gate evaluates the task
  Then gate status fail with reason containing not_checked

Scenario: verify prompt records reviewer probes as proofs
  Test: verify prompt records reviewer probes as proofs
  Given prompts/verify.md after the edit
  When reading Layer 1
  Then the reviewer record command with --runner reviewer is documented

Scenario: review SKILL names the computed verdict
  Test: review SKILL names the computed verdict
  Given skills/review/SKILL.md after the edit
  When reading Stage 1
  Then one line states the evidence verdict is computed from recorded proofs

Scenario: module and gates stay loadable
  Test: node --check scripts/flow-gates.mjs && node -e "import('./scripts/flow-gates.mjs').then(()=>console.log('loads ok'))"
  Given the edited resolver
  When checking syntax and import
  Then both succeed
