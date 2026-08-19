# Changelog

All notable changes to pi-workflows are documented here.

---

## v0.4.0 (unreleased)

### Breaking: migrated to @arhen/pi-core-subagent

Replaced the removed `pi-subagents` + `pi-prompt-template-model` (+ implicit `pi-intercom`) extensions with `@arhen/pi-core-subagent`. No functional feature was lost — the wave engine and per-task model routing got better.

### Added (plan versioning, charter, grill — ported from pi-specflow / grill-for-unknowns)

- **Versioned plans**: `Plan ID: YYYYMMDD-NNN` in plan.md; `/idea` + `/plan` refuse to overwrite a live plan (route to `/review` or `/abort` first). SHIP (`/review` Stage 3) archives the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/<id>-<slug>/`; new `/abort` archives to `.workflows/archive/superseded/`. CONTEXT.md, ADRs, LOG.md stay live and never archive. Plan IDs derive from the archive listing so they never collide.
- **Project charter**: new `templates/AGENTS.md` copied to the project root by `/idea` — pi auto-loads AGENTS.md for every session including pi-core-subagent children, so containment rules bind everyone: single status writer for `.workflows/`, contract-bounded code writes, no subagent commits/merges/pushes, throwaway artifacts stay in their lanes, fail loud.
- **Grill protocol completed** (in `/idea` already; now full): unknowns taxonomy (map vs territory — known knowns / known unknowns / unknown knowns / unknown unknowns), blindspot pass for unknown unknowns before planning, unknown-knowns routing to prototypes instead of text questions, one-blocking-question-at-a-time template with AFK default, question quality bar (material / grounded / answerable) also in `/explore` and `/amend`. Protocol adapted from the grill-for-unknowns skill (Nico Bailon, Matt Pocock); pi-specflow's refinement (Recommended + Evidence + Consequence-if-different payload) folded back in.

- **Thinking tools** (new `templates/THINKING-TOOLS.md`, wired into the skills that need them): **Five Whys** systemic why-chain in `/fix` diagnosis (verifiable whys only, end at a missing guard never "human error", explicit fix level: code/test/process; recurrence tests cover the class); **Six Thinking Hats** divergence→convergence for option generation in `/idea`, `/prototype` (Green generates radically different structures, White/Yellow/Black evaluate); **Impact × Effort matrix** for option convergence in `/idea`, `/optimize` (Quick Wins in, Big Bets de-risked via prototype, Money Pits dropped in writing), `/plan` (quadrants drive bottleneck tags), `/explore` (kill/pivot evidence). Recommendation-with-question was already mandatory via the grill payload — unchanged.

### Changed

- **Dispatch policy moved to `agents/registry.md`** (new, single source of truth): role → prompt file + toolset, and the bottleneck-tag → `model`/`thinking` ladder, applied **per task at dispatch time** (was: hardcoded model frontmatter + `subagents.agentOverrides` settings).
- **Agent files are now verbatim role prompts** pasted into `subagent({ prompt })` — no more agent-file frontmatter, `reads:` preloading, `progress:`, or `inheritProjectContext`. The `task:` text names the files each child must read.
- **Waves are now `needs` edges**: `/next` parallel waves and reviewer/quality-reviewer gating dispatch as one graph call — pi-core-subagent schedules waves, prepends upstream outputs to dependents, and auto-aborts dependents of failed tasks.
- **`/auto-next`**: background runs with `notifyPerTask` + `await_subagent` loop, `reply_subagent`/`steer_subagent` for live steering, `subagent_cancel` on blockers. Removed the per-task `create_goal()` wrappers from both `/next` and `/auto-next` (proof moved to `git diff --stat` + `Verify:` exit codes; pi-native goals remain usable ad hoc).
- **Isolation without worktrees** (in-process children share the filesystem): parallel tasks MUST have disjoint contract `Allowed Changes`; prototypes/experiments isolate by directory (`prototype/variation-a/`, `optimize/exp-a/`) — verified post-run with `git diff --stat` / `git status --porcelain`.
- **Proof over self-report**: every dispatched task carries a runnable `Verify:` line; the orchestrator reconciles results against `git diff --stat` (exit code + diff are ground truth).
- Prompt templates dropped `model:`/`thinking:`/`skill:`/`restore:` frontmatter (unsupported keys); `skill:` became an explicit "load SKILL.md" body instruction. Bug-hunter dispatch is now an inline subagent prompt instead of a CLI invocation.
- README: requirements, model configuration, and directory structure updated.

### Removed

- `pi-subagents`, `pi-prompt-template-model` peer dependencies (now `@arhen/pi-core-subagent`).
- `subagents.agentOverrides` settings pattern (replaced by `agents/registry.md`).

---

## v0.3.0 (2026-06-10)

### New Commands

- **`/auto-next`** — fires a parent `create_goal()` and autonomously executes ALL tasks in `.workflows/plan.md`, wave by wave, parallelizing within waves. Only surfaces on blockers or completion.
- **`/challenge`** — adversarial grill of your plan against domain model. Walks the decision tree, sharpens terminology, updates `.workflows/CONTEXT.md` inline.

### Flow Change

- **Plan → Approve → Contracts**: `/plan` and `/idea` now write the plan first, stop for human approval, then generate `.spec` contracts. No more spec files written before you've green-lit the plan.
- `/next` and `/auto-next` both wrap every subagent dispatch with `create_goal() / update_goal()` for deterministic tracking (inspired by [pi-codex-goal](https://github.com/fitchmultz/pi-codex-goal)).

### Structural

- **`.workflows/` prefix**: All generated artifacts now live under `.workflows/` — `plan.md`, `specs/`, `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/`, `REVIEW_GUIDELINES.md`. No more root clutter.
- **Deterministic bootstrap**: Every workflow starts with `mkdir -p .workflows/` so the agent never hesitates.
- **Templates added**: `templates/CONTEXT-FORMAT.md` (domain glossary format), `templates/ADR-FORMAT.md` (architecture decision record format).

### Spec Improvements

- **Diagrams in contracts**: Contract template now includes an optional `## Diagrams` section with Mermaid examples (flowcharts, state machines, sequence diagrams).

### Verification

- **bug-hunter** integration in `/next` post-task pipeline.
- **open-code-review** line-level AI review after each task.
- **TDD vertical slices**: Workers now write one test → one implementation at a time per contract scenario (RED → GREEN → refactor).

### README

- Updated flow diagram: `PLAN → APPROVE (🛑 GATE) → CONTRACTS (generated) → EXECUTE`.
- `/auto-next` added to all command tables and user journeys.

---

## v0.2.0 (2026-04-xx)

- 8 improvements from V3 upgrade plan
- Subagent delegation for explore + wave execution for `/next`
- Model ID updates, restored upfront spec writing
- Removed JIT contracts (contracts written upfront, not lazily)
- Removed `/help-workflows` (moved to README)
- Strengthened evidence-first workflows
- Documented optional UX extensions (pi-interview, pi-annotate, bombadil, pi-boomerang)

---

## v0.1.0 (2026-03-xx)

- Initial release of pi-workflows
- Contract-driven multi-model workflow for pi
- Core commands: `/idea`, `/plan`, `/explore`, `/next`, `/add`, `/fix`, `/refactor`, `/review`, `/verify`, `/docs`
- agent-spec contract verification (BDD scenarios + boundary enforcement)
- pi-subagents parallel execution
- Bottleneck tags and testing strategy matrix
- Cost logging per task
