spec: task
name: "tdd-gate-disposition"
tags: [decision, tdd-gate, log]
verify: "grep -q 'accepted skip' .workflows/LOG.md && node scripts/decisions.mjs check --plan .workflows/plan.md"
---

## Intent

Close the tdd-gate follow-up item: record the owner-approved disposition — the absent tdd-gate binary is an accepted skip, not a pending install.

## Decisions

- Disposition: accepted skip. The pipeline degrades loudly by design (execution-doctrine); installing `tdd-guard` stays possible later but is not planned.
- The decision is recorded in LOG.md; if decisions.mjs classifies it as standing, one record entry is added via `node scripts/decisions.mjs record`.
- No install of tdd-guard in this task.

## Boundaries

### Allowed Changes
- .workflows/LOG.md
- .workflows/decisions/**

### Forbidden
- Do not install tdd-guard or modify package.json
- Do not modify execution-doctrine.md or the degradation behavior
- Do not touch any other backlog item

## Completion Criteria

Scenario: disposition recorded in the log
  Test: grep -q 'accepted skip' .workflows/LOG.md
  Given LOG.md after the entry
  When reading the tdd-gate line
  Then it states the accepted-skip disposition with the reason (optional peer dep; loud degradation is the tested default)

Scenario: decision index stays clean
  Test: node scripts/decisions.mjs check --plan .workflows/plan.md
  Given the live plan and records
  When running the decision index check
  Then CLEAN

Scenario: negative — no install happened
  Test: ! command -v tdd-gate >/dev/null 2>&1
  Given the machine after this task
  When probing for the binary
  Then it is still absent — the disposition is skip, not install
