# Review — task-verification-tiers
Task: Complexity-gated verification tiers · Contract: .workflows/specs/task-verification-tiers.spec

## Round 1 — 2026-08-21 · reviewer
**ok: true**
### Findings
- PASS — registry "Verification policy" section: 3 tiers (docs/standard/high-risk) mapping traits → reviewer model+thinking+pass shape; tier derivation orchestrator-side from spec (tags+Intent+Boundaries), worker never self-assesses
- PASS — verdict mandatory at every tier (doctrine #7 unchanged)
- PASS — next.md verdict-gate + auto-next Step 2 wired to the policy (grep 2/2/2)
- PASS — bun test 13/13, drift CLEAN; exactly 3 allowed files (+21/−3)
- NOTE — legacy reviewer bottleneck-table row replaced by pointer to tier table (worker judgment call; sound anti-drift)
- ⚠️ agent-spec lifecycle skips all scenarios (pre-existing: grep-style Test: selectors unbound) — manual scenario verification used, all 4 pass
