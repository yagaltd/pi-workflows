# Plan: Engine-enforced verification loop + complexity-gated review tiers

> Plan ID: 20260821-001
> Created: 2026-08-21
> Status: DONE

## Lifecycle
- Plan ID assigned once at bootstrap: NNN = archive entries + 1.
- `/idea` and `/plan` refuse to overwrite a live plan.
- SHIP (`/review`, all ✅) → `archive/done/`; `/abort` → `archive/superseded/`.
- `CONTEXT.md`, `docs/adr/`, `knowledge/`, `LOG.md` never archived.

## Context
- Verdict gating exists as doctrine (execution-doctrine.md) but is model-remembered: the orchestrator must remember to dispatch the reviewer after each worker. pi-core-subagent `needs` edges can make worker→reviewer one graph call — mechanically guaranteed.
- Verification is currently one-size-fits-all: every task gets the same reviewer shape, regardless of complexity or risk traits.
- Quality-reviewer placement is ambiguous (per-task? per-wave? plan?). Waves are independent parallel tasks (disjoint boundaries) — per-wave quality review judges unrelated changes together.
- Constraints: prompt-engineering repo + one small extension; all changes verifiable via drift checker, unit tests, and live dogfood runs.

## Decisions (fixed)
- Engine handles unconditional sequencing (needs edges); orchestrator handles conditionality (fix rounds stay follow-up dispatches — the engine has no conditional nodes).
- Reviewer verdict remains mandatory for ✅ (doctrine #7 unchanged) — complexity scales the reviewer's COST (model/thinking), not its existence. Exception: pure-docs tasks get the lightest reviewer pass, never a skip.
- Quality-reviewer: per-task, gated by bottleneck tag (🔴/🟡/🟠 only); never per-wave. `/review` remains the whole-plan quality gate.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | Unified worker→reviewer graph in sequential /next | 🟡 RISKY | example-based (live dogfood) | 0 | — |
| TASK_2 | worker | Complexity-gated verification tiers in registry | ⚪ STANDARD | example-based | 1 | TASK_1 |
| TASK_3 | worker | Quality-reviewer placement codified | ⚪ STANDARD | example-based | 1 | TASK_2 |
| TASK_4 | worker | Live dogfood verification of the new loop | 🟠 VERIFICATION_HEAVY | live-run evidence | 2 | TASK_1-3 |

## Tasks

### TASK 1: Unified worker→reviewer graph in sequential /next
- **Agent**: worker
- **Depends on**: none
- **Bottleneck**: 🟡 RISKY (touches the core dispatch path)
- **What**: sequential /next dispatches ONE subagent call: `tasks: [worker, reviewer(needs:[worker])]` — reviewer fires mechanically when the worker settles, worker output prepended. Fix rounds remain conditional follow-ups (doctrine unchanged). Update the sequential shape in prompts/next.md, the loop diagram + reviewer shape in agents/execution-doctrine.md, and the sequential example in agents/dispatch-shapes.md. Note in doctrine: failed worker auto-aborts reviewer — correct (don't review broken work); orchestrator sees the abort as the failure signal.
- **Contract**: .workflows/specs/task-unified-graph.spec
- **Status**: ✅ DONE
- **Cost**: ~$0.52 worker+reviewer (68k↑/23k↓ tokens) · ~9 min
- **context: updated**

### TASK 2: Complexity-gated verification tiers
- **Agent**: worker
- **Depends on**: TASK 1
- **Bottleneck**: ⚪ STANDARD
- **What**: registry.md gains a "Verification policy" table — task traits → reviewer dispatch: (a) pure docs/test-data → reviewer thinking low, single mechanical pass; (b) ⚪ standard code → reviewer inherit/medium-high; (c) security/concurrency/parsing/external-input traits → strongest available model + xhigh; (d) trait detection from the spec's tags + Intent + Boundaries. Wire the tier selection into the /next dispatch step and auto-next Step 2 (one line each: "reviewer dispatch per registry verification policy").
- **Contract**: .workflows/specs/task-verification-tiers.spec
- **Status**: ✅ DONE
- **Cost**: ~$0.18 worker+reviewer in ONE graph call · ~4 min
- **context: no changes (worker reported none)**

### TASK 3: Quality-reviewer placement codified
- **Agent**: worker
- **Depends on**: TASK 2
- **Bottleneck**: ⚪ STANDARD
- **What**: execution-doctrine.md + registry: quality-reviewer runs per-task ONLY for 🔴/🟡/🟠 tags (after mechanical ok:true), never per-wave (waves are independent parallel tasks — quality review of unrelated changes together is the wrong granularity); `/review` stays the whole-plan quality gate. Update next.md step 4 + auto-next Step 4 wording.
- **Contract**: .workflows/specs/task-quality-placement.spec
- **Status**: ✅ DONE
- **Cost**: ~$0.14 worker+reviewer in one graph call · ~3 min
- **context: updated**

### TASK 4: Live dogfood verification
- **Agent**: worker
- **Depends on**: TASK 1-3
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **What**: live run in a scratch repo: (a) sequential /next with the unified graph — verify the reviewer fired automatically (needs edge) with zero orchestrator turns between worker and reviewer; (b) a docs-tier and a security-tier task — verify different reviewer dispatches per the tier table; (c) a 🔴-tagged task — verify quality-reviewer follows. Record evidence (subagent outputs) + learnings in Execution Notes; fix any drift found.
- **Contract**: .workflows/specs/task-dogfood-verify.spec
- **Status**: ✅ DONE
- **Cost**: ~$0.57 across 6 live dispatches · ~20 min
- **context: updated**

## Contracts (generated after approval)
| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 1 | .workflows/specs/task-unified-graph.spec | 4 scenarios |
| TASK 2 | .workflows/specs/task-verification-tiers.spec | 4 scenarios |
| TASK 3 | .workflows/specs/task-quality-placement.spec | 3 scenarios |
| TASK 4 | .workflows/specs/task-dogfood-verify.spec | 3 scenarios |

## Execution Notes

### TASK 1 learnings (2026-08-21)
- Worker + reviewer ran with @role: substitution through real dispatches — extension held up under a 23-turn worker.
- Reviewer independently falsified the worker's "all checks green" claim (agent-spec/tdd-guard anomalies) — verdict gating catching self-report inflation, as designed.
- Tooling findings (file as follow-ups, NOT silently fixed): (1) agent-spec guard --change-scope worktree reports absolute paths vs spec-relative Allowed Changes → false-positive boundary failures; (2) agent-spec lifecycle skips scenarios whose Test: is a shell command (no verifier bound) — specs need unit-test-shaped selectors or lint-ack markers; (3) tdd-guard lint flags tests/extension.test.ts as assertionless (bun reports 25 expects — detection suspect for bun:test).
- Orchestrator drift note: I dispatched TASK_1's worker WITHOUT background:false (auto-bg on) — recovered via await_subagent; the lean prompt says it, I failed to follow it once.

### TASK 2 learnings (2026-08-21)
- FIRST full unified-graph run: worker + reviewer in ONE call — reviewer fired via needs edge with zero orchestrator turns, worker output auto-prepended. Engine rejected my first malformed graph (needs referencing agent name instead of task id) BEFORE spawning — bad graphs cost nothing, as designed.
- The TASK_1 mechanism is proven: this is exactly the "call a reviewer once done automatically" the plan asked for.

### TASK 3 learnings (2026-08-21)
- Worker found a latent contradiction (next.md wave section still said quality-reviewer follows as needs edge) and fixed it in-scope with the reviewer confirming — contract boundaries working as designed.
- Second unified-graph run: reviewer auto-fired via needs edge again, zero orchestrator turns.

### TASK 4 learnings (2026-08-21 — live evidence, scratch repo)
- Unified graph + tier policy + fix rounds + quality gate all verified LIVE: reviewer auto-fires (needs edge, zero orchestrator turns, 4×); docs-tier vs security-tier reviewer dispatches differ per policy; a REAL rejection exercised the full fix-round loop (contract self-conflict found by xhigh reviewer → amend → docs-only fix → ok).
- Robustness bonus: 2 orchestrator cwd mis-dispatches were caught independently by worker (WORKER_BLOCKER), reviewer (FAIL), and quality-reviewer (refused phantom approval). The gate chain defends against ITS OWN orchestrator.
- ORCHESTRATOR DRIFT (mine, twice): forgot `cwd` for scratch-repo dispatches. Follow-up filed: dispatch-shapes.md should note per-task `cwd` for out-of-tree targets. Not silently fixed (contract forbids).
- Follow-ups filed (from all 4 tasks): agent-spec path normalization false positive; grep-style Test: selectors unbound in lifecycle; tdd-guard bun:test detection; dispatch-shapes cwd note.

### /review round (2026-08-21)
- Stage 1 Layer 4 round 1: ok:false — docs-drift watchdog + AGENTS.md rules shipped undocumented (the watchdog violated its own policy); fixed in b1c7642.
- Stage 2 round 2: ok:false — bug-hunter confirmed 5 (drift gate no-op BH-001 critical, roleBody note leak BH-002, next.md dialect triplication BH-003, numbering, false CHANGELOG claims) + quality P1-P4; fixed in 313b40f; round 3 ok:true.
- SHIP 2026-08-21 after human approval — branch merged to master, CI runs the now-real drift gate.
