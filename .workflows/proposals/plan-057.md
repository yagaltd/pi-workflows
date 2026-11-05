# Proposal — 20261104-057: diagram tooling swap + mechanical generators (DRAFT — awaiting approval)

> Plan ID: 20261104-057
> Source: owner-directed — SeeCode is a stale fork; diagrams are hand-authored and drift; ship views should come from git, not prose
> Created: 20261104
> Owner: Aurel

## Intent

Replace the stale SeeCode fork with its active upstream (diagram-design), then make plan and ship diagrams mechanical: scripts emit the JSON the tool consumes, from plan.md/specs and git diffs — the agent never hand-writes a diagram again.

## Facts pinned (research)

- SeeCode (Aryanutkarsh/SeeCode) is a **fork** of cathrynlavery/diagram-design; the fork is behind: upstream has **45 types** including `architecture delta` (before/after — the owner's ship-view wish, native), kanban (plan/tasks), dependency graph (task edges), story map, service blueprint; plus `.drawio`/Mermaid/`.excalidraw` import extractors, PNG/SVG export, `self_check.py`.
- Upstream clone exists locally: `~/Documents/vibe/diagram-design` (MIT, CI, trendshift-listed). Format: compact JSON spec → standalone HTML/SVG; node budget ≤9/diagram (split beyond).
- Existing hand-authored `diagrams/pi-workflows.json` was agent-written — will drift; becomes generator output.
- Build-own: rejected (would reimplement 45 types); SeeCode: rejected (stale fork, fewer types).

## What

- **T0** (orchestrator-inline, machine-level, not a repo task): remove the SeeCode package; install upstream diagram-design (correct pi install path for the local clone, else `npx skills add cathrynlavery/diagram-design`); render-verify one throwaway spec. Evidence in LOG.
- **T1** (worker): `scripts/plan-diagram.mjs` — deterministic parser: `.workflows/plan.md` + `.workflows/specs/*.spec` (agent-spec headers: name/tags/verify + Intent/Boundaries) → dependency-graph JSON (tasks = nodes, edges = task order/declared deps, sub-label = Intent first clause, split >9 nodes). Bun tests pin: fixture plan parses, emitted JSON has nodes/edges shape, budget split works. Regenerates `diagrams/pi-workflows.json` as output (replaces hand-authored).
- **T2** (worker): `scripts/ship-diagram.mjs` — `git diff --name-status <prev-tag>..<HEAD>` → architecture-delta JSON (A/M/R→moved/D → upstream delta type) + markdown tables (features from current CHANGELOG section; issues + criticality parsed from `.workflows/reviews/*.md` verdicts when present — deterministic only, NO-JUDGE default). Bun tests pin the A/M/R/D mapping and table emission on a fixture diff.
- Ship **v0.14.13** after Tier A inline verdict.

## Docs impact

- `scripts/plan-diagram.mjs` (new), `scripts/ship-diagram.mjs` (new), `tests/*.test.ts` (pins), `diagrams/pi-workflows.json` (regenerated), README dev-tools block (one), CHANGELOG at ship.

## Risks / assumptions

- ⚪ Upstream spec format differs from SeeCode's (45-type evolution) — generators target the installed upstream's documented format, verified against a live render in T1/T2 acceptance.
- ⚪ Criticality grading is deterministic-parse in v1 (NO-JUDGE default); TypeLLM grading deferred until a key is provisioned.
- ⚪ T0 is machine-level — reported in LOG, outside repo boundaries.

## Tasks

- **T0** inline (machine tooling swap, render-verified)
- **T1** (worker, low): plan-diagram generator + pins — TDD red first
- **T2** (worker, low): ship-diagram generator + pins — TDD red first (T1/T2 independent, parallelizable)
- Verdict: orchestrator-inline Tier A at final HEAD; ship v0.14.13.
