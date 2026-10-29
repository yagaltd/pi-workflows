Start every reply with "Aurel,". No exceptions.

<!-- pi-workflows charter — CORE + POINTERS + PROJECT, budget 60 lines (validate: bash scripts/agents-lint.sh AGENTS.md; doctrine: templates/DOCS-POLICY.md) -->

## CORE

- Containment: touch only your task's Allowed Changes; anything outside is reported, never fixed (gate: `agents/registry.md` roles + `agents/execution-doctrine.md`).
- Commits: no agent commits, merges, or pushes; a gate commits only after review passes.
- Refactor first: extend existing structure before adding new surface.
- TDD: failing test first, then the fix — `bun test` stays green.
- Subtract first: prefer deleting or simplifying over adding.
- Root causes: fix causes, not symptoms; never patch around a defect (gate: `agents/execution-doctrine.md` fix rounds).
- Docs discipline: docs describe current state, history only in CHANGELOG.md; `scripts/check-drift.sh` stays CLEAN.

## POINTERS

- Agent roles and dispatch policy (orchestrator, worker, reviewer): `agents/registry.md`
- Docs canon (doc types, doc-drift rules): `docs/canon.md`
- Docs policy (README/CHANGELOG discipline): `templates/DOCS-POLICY.md`
- User-facing skills (the /commands): `skills/`
- Benchmarks: `scripts/bench-worktree-backend.sh`

## PROJECT

- Orchestration: the orchestrator plans, delegates, verifies — never implements (gate: `agents/registry.md` + review verdicts).
- One live plan: .workflows/plan.md; SHIP archives it, /abort supersedes it — never overwrite a live plan (gate: `scripts/check-archive.sh` + the archive bundle).
- Bookkeeping is LOG-only: execution notes go to .workflows/LOG.md; subagents never write plan, spec, or review state (gate: `agents/registry.md` roles + verdict files).
- Contract Boundaries derive from the documented tree — an Allowed Changes path outside it is a scope error, reported not fixed.
