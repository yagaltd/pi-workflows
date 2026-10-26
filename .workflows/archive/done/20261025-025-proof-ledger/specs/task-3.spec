spec: task
name: "proof-ledger-wiring-docs-release"
tags: [proofs, wiring, docs]
max-rounds: 2
---

## Intent

Record proofs in the dispatch protocols, document the ledger, release
v0.9.3.

## Decisions

- `/next` + `/auto-next`: after a verdict settles, record the proof —
  `node scripts/proof-ledger.mjs record --plan <id> --task <id> --verify "<Verify>" --spec <spec>`.
- README Proof ledger section names record + collect (claim-to-gate rule).

## Boundaries

### Allowed Changes
- prompts/next.md
- prompts/auto-next.md
- README.md
- CHANGELOG.md
- package.json
- tests/proof-docs.test.ts

### Forbidden
- scripts/proof-ledger.mjs (tasks 1–2 own it)
- extensions/index.ts, agents/, templates/

## Completion Criteria

Scenario: readme and review prompt document the proof ledger
  Test: readme and review prompt document the proof ledger
  Then README has the Proof ledger section and next.md carries the record line

Scenario: example proof round-trips through record and verify
  Test: example proof round-trips through record and verify
  Then a recorded echo proof re-verifies clean in a temp ledger
