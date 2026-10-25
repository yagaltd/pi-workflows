# Plan: casual intake — typed candidate requirements (019)

> Plan ID: 20261025-019
> Status: SHIPPED 2026-10-25 — v0.8.4 (final gate review-final ok:true, first pass)
> Created: 2026-10-25
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo + fork binary as checker. T1 W1 (dispatch); T2 W2 (inline).

## Context

Backlog item 8 (`.workflows/proposals/20261024-session-backlog.md`) — casual intake: `idea` and `brainstorm` sessions produce raw prose with no path into the requirement system. The fork (agent-spec 1.5.0) already ships the landing surface: `agent-spec requirements import --from <file> --check` consumes **marked PRD/issue blocks** and validates them without importing (`--check`), then imports into `knowledge/requirements/*.md` on the real run. Governance stays fork-native: post-import transitions are explicit human commands (`requirements transition`) — unchanged by this plan.

Machine state: `prompts/idea.md` is 9 lines, `prompts/brainstorm.md` is 47 lines — both gain at most one intake paragraph. The marked-block format is fork-internal; TASK 1 discovers it from the fork's import implementation (read-only reference — the plan-016 T1 pattern).

## Decisions

- **D1 — Intake emitter.** `prompts/idea.md` + `prompts/brainstorm.md` gain ONE intake step each: emit candidate requirement blocks to `.workflows/intake/<date>-<slug>.md` in the fork's marked-block format (format discovered from the fork's import parser — read-only reference). One paragraph per prompt; no flow rewrite.
- **D2 — Check-first, human-gated import.** The emitter's verify line: `agent-spec requirements import --from <intake-file> --check` exits 0 (blocks parse). The real import runs ONLY after human review approves specific blocks; rejected blocks stay in the intake file annotated `rejected: <reason>` — audit trail, never auto-imported.
- **D3 — Governance unchanged.** No transition/supersede automation. Post-import, the fork's human governance commands apply as-is. The intake file is ephemeral (`.workflows/` untracked); imported requirements carry fork provenance.
- **D4 — Import destination.** pi-workflows dogfoods `--out .workflows/requirements/` (ephemeral, untracked) — requirements are upstream machine truth that future plans/contracts consume; promotion into `docs/` or specs happens through the normal planning flow, not the intake.
- **D5 — Version 0.8.4** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 intake emitter + format discovery | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 README + CHANGELOG v0.8.4 | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): intake emitter + format discovery — prompts/idea.md, prompts/brainstorm.md ✅
- Discover the marked-block format from the fork's import parser (`/home/aurel/Documents/vibe/coding-agent/agent-spec` — read-only reference; grep the import command implementation).
- ADD the intake step to both prompts (one paragraph each): emit `.workflows/intake/<date>-<slug>.md` in the discovered format; verify with `agent-spec requirements import --from <file> --check`; import only on human approval.
- Fixture: a sample intake file under `tests/intake/` (or docs example) proven by `--check` in the fork.

### TASK 2 (Tier A, ⚪): docs + ship — orchestrator-inline ✅
- README intake section (idea/brainstorm → intake → human review → import), CHANGELOG v0.8.4, version bump.

## Adversarial pass (on record)

- Marked-block format may be undocumented → read the fork's import parser source (read-only); if the format turns out ambiguous or the parser rejects valid-looking blocks, STOP and report the discovery (worker_blocker class: unclear_requirement → orchestrator re-scopes with the owner).
- idea.md at 9 lines → one paragraph keeps it under ~20; thin-trigger rule measured (≤20 lines).
- Auto-import temptation → D2 is absolute: `--check` in the emitter; the real import is a separate human-approved step. The governance gate (fork transitions) is untouched.
- Intake file location is ephemeral (.workflows untracked) — fine: candidates are transient until imported; imported requirements live in the fork's knowledge store.

## Verification (whole-plan final gate)

Fixture intake file passes `agent-spec requirements import --from ... --check` in the fork (0 errors) · prompts carry the intake step (grep) · idea.md ≤ 20 lines · drift CLEAN · bun 115/109+ tests green · docs-lint exit 0 · final whole-plan reviewer (read-only over committed evidence — the 015–018 pattern).
