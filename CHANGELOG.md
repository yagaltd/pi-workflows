# Changelog

All notable changes to pi-workflows are documented here.

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
