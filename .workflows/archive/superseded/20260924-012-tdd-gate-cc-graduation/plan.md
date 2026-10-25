> Superseded: 2026-10-24 — cancelled by owner before approval (Status was DRAFT — AWAITING APPROVAL). Bundle split: @cc requirements graduation REJECTED (requirements home stays .spec; @cc scope narrowed to code-local invariants — see CONTRACTS scope line). Test-quality CLI decision (tdd-gate vs tdd-guard) re-queued as its own proposal: .workflows/proposals/20261024-test-quality-cli.md

# Plan: tdd-gate integration + @cc requirements graduation (012)

> Plan ID: 20260924-012
> Status: DRAFT — AWAITING APPROVAL
> Created: 2026-09-24
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Two repos: pi-workflows + vibe/tdd-gate (cross-repo tasks carry REPO GUARD + cwd).

## Context

Tests-first is currently role discipline, not a gate (worker prompt only; tdd-guard is post-hoc lint). tdd-gate (vibe/tdd-gate, Jev-powered CLI: coverage/blame/gaming/weakening/drift) enforces it by construction. Integration replaces three moving parts with one: pi-typesafe's two advisory Jev aids (dropped — tdd-gate becomes the ONLY Jev consumer, own key), tdd-guard in the build pipeline (demoted to brownfield /fix + /refactor), and requirements.yml (never created — requirements come from the .spec itself, or from @cc contracts in code).

**Probe evidence (live, 2026-09-24)**: `agent-spec parse --format json` on a fixture spec returns `sections[kind=acceptance_criteria].scenarios[]` with `name`, `steps[]` (given/when/then + text), and `test_selector.filter` = the exact test function name. The adapter needs NO duplicate parser. `cc-check list <file>` emits parseable text (`◆ id:line / scope · label · id / > prose`), no JSON flag.

**Worktree mechanics (verified)**: pi-core-subagent write tasks get isolated worktrees + branch commits; cross-wave sequencing = orchestrator merges the tester's branch after the coverage gate, then dispatches the code worker wave on the merged tree. Code worker SEES tests (self-verify requires it) — soft isolation; the gaming gate is the compensating control.

## Decisions

- **D1 — No requirements.yml, ever.** tdd-gate gains two input modes: `--spec <file.spec>` (shells `agent-spec parse --format json`, maps scenarios→requirements in memory) and `--contracts <files...>` (shells `cc-check list`, maps contracts→requirements). `.spec` stays the single task-done authority; @cc stays the durable record.
- **D2 — Two-phase dispatch for build tasks**: tester role (write worktree, tests only, RED expected) → orchestrator runs `tdd-gate coverage --spec` → gaps loop to tester → clean ⇒ merge tester branch → code worker + reviewer wave (worker implements to GREEN; reviewer Layer 2 = `tdd-gate gaming` + `drift --spec` on the worker diff). `blame` output rides fix-round prompts on failures.
- **D3 — Degradation**: tdd-gate not installed ⇒ legacy single-worker shape (current flow), dispatch notes the skip. tdd-gate becomes an optional peer dep; agent-spec absent ⇒ `--spec` mode hard-errors with install hint (no silent fallback).
- **D4 — pi-typesafe de-stacked from pi-workflows**: quality-reviewer Check #5 (Jev compliance pre-pass) REPLACED by a contract-relevance check; extension supersede probability-routing seam removed (static advisory line stays); README/doctrine/CHANGELOG updated. pi-typesafe may stay installed at pi level — pi-workflows stops referencing it.
- **D5 — tdd-guard demoted to brownfield**: stays optional peer, cited ONLY in /fix and /refactor verification (static, offline); removed from build-task Layer 2 and worker self-verify.
- **D6 — Graduation rule (SHIP)**: every durable Completion Criteria scenario must exist as an @cc on a touched seam at SHIP. Worker annotates during build (existing rule, now scoped to spec scenarios); orchestrator audits at SHIP; `cc-check list` on Allowed files is the audit input.
- **D7 — Supersede watchdog**: `owner:` metadata = routing target (who signs off when the advisory fires); `adr:` stays the decision link; mechanical trigger unchanged, still advisory-never-gates.
- **D8 — Cross-repo protocol**: T1/T2 workers run with cwd=/home/aurel/Documents/vibe/tdd-gate (REPO GUARD line carries it); specs live in pi-workflows/.workflows/specs/; Verify: lines cd into the target repo.
- **D9 — Version 0.7.0** at SHIP.

## Spec Map

| Task | Contract | Wave | Model @model: refs |
|------|----------|------|--------------------|
| T1 tdd-gate --spec mode | task-1.spec | 1 | @model:standard |
| T2 tdd-gate --contracts mode | task-2.spec (needs T1) | 2 | @model:standard |
| T3 agents/*: tester role + shapes + Layer 2 swap + quality check swap | task-3.spec | 2 | @model:standard |
| T4 skills/*: add-feature/fix/refactor/plan wiring | task-4.spec (needs T3) | 3 | @model:standard |
| T5 extension: owner routing + Jev seam removal | task-5.spec | 1 | @model:standard |
| T6 templates/README/package/CHANGELOG + drift | task-6.spec (needs all) | 4 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟠): tdd-gate `--spec` input mode — REPO: /home/aurel/Documents/vibe/tdd-gate
- **Contract**: task-1.spec · **Verify**: `cd /home/aurel/Documents/vibe/tdd-gate && npm run typecheck && npm test`
- **What**: in `src/requirements.ts` add a spec loader beside `loadPlan`: spawn `agent-spec parse <file> --format json`, map each acceptance_criteria scenario → requirement (id = slugified scenario name — charset `/^[A-Za-z0-9_.-]+$/`, spaces→dashes; text = joined step lines, optional `expectedTest` = `test_selector.filter` for a mechanical name-presence pre-pass); wire `--spec` as alternative to `--requirements` in coverage/blame/drift/run (cli.ts). agent-spec missing/bad exit ⇒ PlanError with install hint. Fixture specs in tests (multi-scenario, slug charset cases, Test-less error case, malformed AST). README usage lines updated.

### TASK 2 (Tier B, 🟠): tdd-gate `--contracts` input mode — REPO: /home/aurel/Documents/vibe/tdd-gate
- **Contract**: task-2.spec (needs T1) · **Verify**: same as T1
- **What**: contracts loader: spawn `cc-check list <file>` per input file, parse `◆ id:line`, `scope:…· label:… · id:…`, `> prose` blocks → requirements (id = contract id, text = prose). Wire as `--contracts <files...>` alternative input. cc-check missing ⇒ hard error with hint. Fixture outputs in tests (multi-contract, continuation prose lines, missing-binary error).

### TASK 3 (Tier B, 🟡): pi-workflows agents/* — tester role, two-phase shape, Layer 2 swap
- **Contract**: task-3.spec · **Verify**: `cc-check format && bash scripts/check-drift.sh`
- **Allowed**: agents/tester.md (new), agents/registry.md, agents/worker.md, agents/reviewer.md, agents/quality-reviewer.md, agents/execution-doctrine.md, agents/dispatch-shapes.md
- **What**: tester.md (write, medium: reads spec scenarios, writes ONLY test files with exact Test: names, runs suite, RED-for-new-selectors = success signal, reports red list + Domain Memory); registry row; dispatch-shapes: `tdd task` shape (Wave A tester → orchestrator coverage gate `tdd-gate coverage --spec .workflows/specs/<task>.spec --tests <dir> --format json` → merge → Wave B worker+reviewer stacked, reviewer Layer 2 = `tdd-gate gaming --diff` + `drift --spec`); reviewer.md Layer 2 rewritten (tdd-gate for build tasks; tdd-guard brownfield note moves out); worker.md self-verify section updated; quality-reviewer.md Check #5 → contract-relevance check (violations reported ONLY when tied to changed behavior, a relied-upon assumption, or a changed contract — proximity alone never qualifies); execution-doctrine.md: Jev pre-pass section removed, degradation rule (D3) added.

### TASK 4 (Tier B, 🟡): pi-workflows skills/* — flow wiring
- **Contract**: task-4.spec (needs T3) · **Verify**: `cc-check format && bash scripts/check-drift.sh`
- **Allowed**: skills/add-feature/SKILL.md, skills/fix/SKILL.md, skills/refactor/SKILL.md, skills/plan/SKILL.md
- **What**: add-feature: two-phase dispatch (tester→gate→worker), Layer 2 swap, graduation reminder at SHIP; fix/refactor: tdd-guard stays (brownfield), no tdd-gate requirements loop; plan: `tdd:` task flag (routes to the tester shape), spec-drafter note (scenarios must carry Test: selectors — unchanged).

### TASK 5 (Tier B, 🟠): pi-workflows extension — owner routing + Jev seam removal
- **Contract**: task-5.spec · **Verify**: `bun test`
- **Allowed**: extensions/index.ts, tests/extension.test.ts
- **What**: supersede advisory line names `owner:` values as sign-off targets (parse from the matched contract's metadata; absent owner ⇒ generic human-gate line); remove the Jev probability-routing seam (`supersedeAdvisoryLine` export + threshold logic) — static advisory only; tests updated (owner-parsing cases, seam-removal regressions).

### TASK 6 (Tier A, ⚪): docs + ship prep — orchestrator-inline
- **Contract**: task-6.spec (needs all) · **Verify**: `bash scripts/check-drift.sh && cc-check format`
- **Allowed**: templates/CONTRACT-FORMAT.md, README.md, package.json, CHANGELOG.md
- **What**: CONTRACT-FORMAT: graduation rule (D6) in contract-writing rules; README: flow diagram + Commands + Requirements (tdd-gate optional peer replaces pi-typesafe entry; tdd-guard marked brownfield; TYPESAFE_API_KEY note moves to tdd-gate); package.json: optionalPeerDependencies += tdd-gate, version 0.7.0; CHANGELOG v0.7.0.

## Out of scope
- `tdd-gate run` orchestrator integration (never — it owns the loop; gates only)
- cc-check `callers`/`references` (removed upstream — do not build on them)
- agent-spec `promote`/living-spec library adoption (separate decision)
- pi-typesafe uninstall at the pi level (user-level choice; pi-workflows just stops referencing it)
- Directory-scoped CONTRACTS proliferation beyond the root file
- herdr wave-delegation of the new tester shape (later, if ever)
