# Review — task-dogfood-verify (live run evidence)
Task: Live dogfood verification · Contract: .workflows/specs/task-dogfood-verify.spec

## Round 1 — 2026-08-21 · orchestrator-run, evidence-verified

### Scenario: reviewer auto-fires via needs edge — ✅
Docs-tier task (scratch repo): ONE subagent call, tasks [worker, reviewer(needs)] — reviewer fired with zero orchestrator turns, verdict ok:true. Reproduced 3× (TASK_1/2/3 of this very plan also ran as graphs).

### Scenario: tier dispatches differ — ✅
- docs-tier → reviewer thinking low (verdict ok:true round 1)
- security-tier ([security, external-input] tags) → reviewer xhigh → REJECTED with genuine finding (spec Intent required docs; Boundaries excluded README.md — contract self-conflict)
- 🔴 BLOCKING + concurrency → reviewer xhigh, concurrency check pass

### Scenario: fix-round loop — ✅ (unplanned, real rejection)
ok:false → orchestrator amended contract (boundary + README.md, annotated in spec) → fix round 1 with rejection evidence verbatim → docs-only fix (exactly what findings named) → re-review ok:true.

### Scenario: quality-reviewer tag-gate — ✅
🔴 task after mechanical ok:true → standalone quality-reviewer follow-up (never a needs node, never per-wave) → ok:true with 3 advisory findings.

### Scenario: gates hold against orchestrator error — ✅ (unplanned)
Orchestrator mis-dispatched twice (forgot cwd for scratch repo): worker emitted WORKER_BLOCKER invalid_contract (refused to fabricate); reviewer FAILED the phantom task; quality-reviewer REFUSED to approve nonexistent code ("approving a phantom task would put a false ✅ into the verdict record"). All three gates independently caught the same orchestrator mistake.
Also: engine rejected a malformed graph (needs→agent-name instead of task id) BEFORE spawning — bad graphs cost nothing.

## Verdict
**ok: true** — all contract scenarios evidenced; 2 unplanned robustness scenarios additionally evidenced.
