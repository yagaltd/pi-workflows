# Proposal: session decision backlog (ranked queue)

- Date: 2026-10-24
- Reordered: 2026-10-24 — coupling-based promotion (docs canon to slot 1; dispatcher + cache-affinity merged to slot 2)
- Status: QUEUE — enters via `/plan` one at a time; starts after plan 20260924-013 (test-quality verdict + wiring) lands
- Origin: working session 2026-10-24 (pi-workflows evolution review; TypeLLM API docs; LayerFS v1.1.0 inspection; Lore doc-standards research). Origins of adopted ideas kept as reference notes per item.

## Queue (ranked)

| # | Item | What | Origin note | Verify |
|---|---|---|---|---|
| 1 | Docs canon + tracked trace | Lore-style doc types + canon for `docs/` reader prose (Diátaxis types) + `docs-lint.sh` (Harper / markdownlint-cli2 / lychee; CI requires externals). Un-ignore durable `.workflows/` paths (LOG.md, CONTEXT.md, reviews/, archive/) or move under `docs/worklog/` — today `.gitignore:5` leaves all decision evidence untracked | Lore (EpicGames/lore) doc-standards canon, adapted by agent-spec | `git log` shows decision trace; docs lint green in CI |
| 2 | Dispatcher + cache-affinity (merged — one plan, shared pack-assembly foundation) | Extension `resolveNext()`: deterministic next-task resolution from `plan.md` (wave/deps/status) + mechanical pack assembly + gate command list; cache-affinity built in as the ordering rule (same-model/same-role adjacency, prefix-stable layout, divergence late, same-tier wave tiebreaker). `/next` becomes thin trigger; model handles exceptions only (BLOCKED, judgment calls). Gate list needs plan 013's Layer 2 (test-quality checks: tdd-gate or tdd-guard) winner | pi-workflows registry + dispatch-ledger trajectory; provider prompt caching | Resolved task matches wave/dep rules (assert in `bun test`); `cache_read/input` ratio measured from day one via `dispatch-ledger.mjs` |
| 3 | Auto-gate hook | Pi extension: on edit/save run Layer 1 (agent-spec checks: contract, lifecycle, guard) then Layer 2 (winner of plan 013); block on failure; `lifecycle --format json` is the verdict feed | majordome hook ideas | Hook blocks a bad write with zero skill dependence |
| 4 | Contract pre-flight | One decision-DAG call per drafted contract: `criterion_testable`, `boundary_complete`, `ambiguity` score, `missing_scenarios`, `second_path_violation` → fix rounds before acceptance; agent-spec lint stays authority | TypeLLM `depends_on` (TypeLLM/TypeSafe) | Defects caught pre-implementation; verdicts in ledger |
| 5 | Doc-drift gate | Extend the docs canon lint (item 1) with rule-to-gate mapping for every behavioral claim; `stale_after` stamps on generated docs; pre-push hook | pi-majordome doc stamps | Drift fails loud; stamps expire |
| 6 | Refactor-first + docs-impact gates | Proposal template: mandatory Refactor assessment + Docs impact sections; pre-spec decision DAG (overlap → verdict enum, block to human on miss); archive blocks until declared docs + changelog updated — plugs into the item-1 canon | MorphEditor project doctrine (refactor-first) + docsVerdicts | Gate refuses bad proposal; archive refuses missing docs |
| 7 | Verdict compaction + triage | At wave settle: one `/v1/generate`, ≤64 typed questions → fixed-size table into leader context; batch failure triage per wave | TypeLLM API (64-question cap) | Leader context growth measured smaller |
| 8 | Casual intake | `idea`/`brainstorm` emit typed candidate requirement blocks → human review → `agent-spec requirements import`; governance gate unchanged | OpenSpec explore/propose | Candidate blocks import clean; rejected prose never auto-imported |
| 9 | Layer workspace backend (pilot) | LayerFS as worktree backend for write children only; measure setup latency + disk vs `.git/subagents/**` git worktrees; keep git contract until measured win | LayerFS × DSH | Pilot report with numbers; NO-GO default |

## Standing principles (bind all queue items)

1. Deterministic gates decide; judges flag and route — never pass or fail a contract.
2. One tool per layer; no second tool in an occupied layer.
3. Every rule names its gate; every claim is grep-able or testable.
4. Low-confidence judge verdicts escalate to the human — one judge never flips a gate.
5. Rejected this session (do not re-propose without new evidence): OpenSpec adoption, openspec-plus/superpowers/superspec, same-session workers, runtime swap to a dynamic orchestrator, TypeLLM as dispatcher, tdd-guard as gate, `@cc` requirements graduation.

## Item 11 (added 2026-10-24, from plan 013 Wave 1 execution)

| # | Item | What | Origin note | Verify |
|---|---|---|---|---|
| 11 | Agent-spec/tdd-guard toolchain defect batch | (a) port Node/.test.ts verifier from upstream agent-spec into the canonical fork v1.4.0 (lifecycle currently NoopVerifier on bun/TS repos); (b) guard per-spec scoping or --spec single-file mode (shared spec-dir verifies cross-repo specs against the wrong tree); (c) tdd-guard v0.1.0 lint parser fix (no-assertionless-tests false positives: destructuring-from-call, template interpolation, nested literals); (d) canonical verify invocation gains `--tests <dir>` | plan 013 Wave 1 execution evidence (reviews/task-1.md, reviews/task-4.md rounds 1–5) | lifecycle binds scenarios on pi-workflows; guard passes per-spec; lint 0 false positives |
