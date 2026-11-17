spec: task
name: optional-reviewer-layers
tags: [reviewer, contracts, cc-check, decision]
verify: "cc-check format CONTRACTS && bun test"
max-rounds: 2
---

## Intent

Two optional reviewer layers have never run here: the `@cc` syntax gate (`cc-check format`, `cc-check list` into dispatch packs) and the web-UI property layer (bombadil). The repo's own CONTRACTS file has therefore never been reviewed by any machine. cc-check is public (crates.io 0.1.4) and cheap to wire; bombadil stays out by owner decision, but the gap must be stated where a reviewer reads it.

## Decisions

- cc-check comes in through the mise `cargo:` backend (it is not in the mise registry) so the version is pinned with the rest of the toolchain.
- bombadil is NOT pinned: accepted gap, recorded in DEC-008 with the revisit trigger "a web-UI plan needs property tests".
- `agents/reviewer.md` states which optional layers run and which are skipped, so an absent layer never reads as a pass.

## Boundaries

### Allowed Changes
- mise.toml
- scripts/decisions.mjs
- agents/reviewer.md
- extensions/index.ts
- CONTRACTS
- templates/FOLLOW-UP-TABLE.md
- .workflows/evals/golden
- tests/extension.test.ts
- .workflows/decisions/DEC-008.md
- .workflows/decisions/INDEX.md

### Forbidden
- docs/**, README.md (orchestrator's SHIP step)
- Adding a required dependency, changing peerDependencies, or installing bombadil
- Editing agents/worker.md, agents/execution-doctrine.md (owned by the DEC-003 task)

## Completion Criteria

Scenario: the contracts file passes its own syntax gate
  Test: cc-check format on CONTRACTS exits zero
  Given the pinned cc-check
  When `cc-check format CONTRACTS` runs
  Then it exits 0, and any finding is fixed in CONTRACTS (allowed path)

Scenario: contract lists ride the dispatch pack
  Test: pack fixture contains the cc-check list output
  Given a task whose Allowed Changes match an attributed contract
  When the pack is built
  Then the contract list appears in the pack
  And a failing `cc-check list` is reported, never swallowed

Scenario: the reviewer states what runs and what skips
  Test: reviewer role names cc-check and the bombadil gap
  Given agents/reviewer.md
  When it is read
  Then the optional-layer paragraph names cc-check as the @cc gate
  And it states the web-UI layer is not installed, with the recorded decision

Scenario: the retired tool is gone from every assertion, not just the emitters
  Test: golden evals, follow-up template and CONTRACTS name no dead binary
  Given the tree after the DEC-003 amendment
  When `grep -rn 'tdd-gate' CONTRACTS templates/FOLLOW-UP-TABLE.md .workflows/evals/golden` runs
  Then nothing names it as the expected tool (a historical note explicitly marked retired is allowed)

Scenario: the golden eval set runs clean at SHIP
  Test: eval-golden case set is coherent with the new chain
  Given the three cases that expected the retired tool (deg-002, gate-002, gate-003)
  When `node scripts/eval-golden.mjs` runs against its baseline
  Then no case fails because an expectation names the retired tool
  And the cases assert the tdd-guard chain instead

Scenario: CONTRACTS is not silently stale
  Test: root CONTRACTS reflects the code's @cc directives
  Given `grep -c '@cc' CONTRACTS` vs the `@cc` directives in extensions/index.ts
  When the reviewer compares them
  Then the new gate-commands contract is present in CONTRACTS
  And the sync step is either gated or documented as the cc-check command that produces it

Scenario: a malformed ledger record cannot pass as clean
  Test: a heading the parser does not recognise is a finding, not id=null
  Given a `.workflows/decisions/*.md` file whose heading is not `# DEC-<n>: <title>`
  When `node scripts/decisions.mjs check` runs
  Then it reports a finding naming the file (a null id must never read as CLEAN)
  And the same holds for a record missing Rule/Status/Decided-by/Scope/Revisit when

Scenario: the accepted gap is a decision of record
  Test: DEC-008 exists with a revisit trigger
  Given the ADR written for bombadil
  When `node scripts/decisions.mjs index` runs
  Then DEC-008 appears with scope and revisit-when naming a web-UI plan needing property tests
