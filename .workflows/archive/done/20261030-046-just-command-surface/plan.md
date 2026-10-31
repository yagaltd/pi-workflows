# Plan 20261030-046 — just command surface + drift hook loop

> Plan ID: 20261030-046

**Status:** DONE (shipped 20261031 — v0.14.0; whole-plan review PASS after fix round; reviews/fix-round.md)
**Evidence:** `.workflows/knowledge/evidence-20261030-just-command-surface.md`
**Intent:** one command entrypoint (`just`) wrapping the existing scripts; CI and pre-push reuse it; doc-touching task packs extend `verify` with the docs gate. No new logic; scripts stay canonical. agent-ci rejected (one-shell-job CI; Docker buys no fidelity).

## Context
- context: plan 046 · just command surface + drift hook loop · owner-approved 20261030 · T1 merged d228de6 · wave 2 running
- Owner decision 20261030: adopt `just`; recipes wrap `scripts/*`, scripts stay canonical; `flow-gates.mjs` stays hardcoded; judge stays out of recipes (doctrine: flags and routes, never gates).
- Assumption (labeled, low-risk): worker verify hook is guidance-level, not a mechanical guard — revisit only if doc-drift recurs.
- Judge-layering doc task dropped — already in `agents/execution-doctrine.md`.
- Owner note: `just` already installed locally; T2 still installs it in the CI runner.

## Exploration
See `.workflows/knowledge/evidence-20261030-just-command-surface.md` — baseline green (bun test 225/0, check-drift CLEAN), CI is one shell job, verify field exists in flow schema, no justfile anywhere.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | Add root justfile (7 wrapper recipes) | ⚪ STANDARD | example-based | 1 | — |
| TASK_2 | worker | ci.yml → just ci (pinned install) | 🟠 VERIFICATION_HEAVY | example-based | 2 | TASK_1 |
| TASK_3 | worker | Pre-push hook → just ci, loud degradation | ⚪ STANDARD | example-based | 2 | TASK_1 |
| TASK_4 | worker | Guidance: flows SKILL verify rule + AGENTS.md pointer | ⚪ STANDARD | — | 2 | TASK_1 |
| TASK_5 | worker | CHANGELOG 046 entry + version 0.14.0 | ⚪ STANDARD | — | 3 | TASK_2-4 |

## Docs impact
- `CHANGELOG.md` — v0.14.0 entry (just surface, ci-lite, pre-push, doc-gate guidance)
- `skills/flows/SKILL.md` — doc-gate rule added to the Run section
- `AGENTS.md` — POINTERS one-liner for the justfile entrypoint

## Tasks

### TASK 1 (Tier B, ⚪): Justfile adoption
- context: merged d228de6 · justfile adoption · verdict ok:true (reviews/task-1.md)
- **Agent**: worker
- **Depends On**: none
- **Wave**: 1
- **Bottleneck**: ⚪ STANDARD
- **Allowed**: justfile
- **Contract**: .workflows/specs/task-1.spec
- **What**: Root justfile; recipes ci/drift/docs/agents/test/flow/docs-if-touched; each wraps an existing script; no new logic; scripts stay canonical.
- **Verify**: just --summary && just ci
- **Status**: ✅ DONE (verdict ok:true, reviews/task-1.md; merged d228de6)
- [PARALLEL-GROUP: A]

### TASK 2 (Tier B, 🟠): CI parity
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Allowed**: .github/workflows/ci.yml
- **Contract**: .workflows/specs/task-2.spec
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **What**: ci.yml installs just via taiki-e/install-action@v2; the job's run step becomes just ci; no Docker.
- **Verify**: grep -q 'uses: taiki-e/install-action@v2' .github/workflows/ci.yml && grep -q 'run: just ci' .github/workflows/ci.yml && just ci
- **Status**: ✅ DONE (verdict ok:true on quiet re-run, reviews/task-2.md; merged 004cb15)
- context: updated — ci.yml now the shared just ci entrypoint (was raw drift script)

### TASK 3 (Tier B, ⚪): Pre-push rewire
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Allowed**: scripts/install-git-hooks.sh
- **Contract**: .workflows/specs/task-3.spec
- **Bottleneck**: ⚪ STANDARD
- **What**: install-git-hooks.sh pre-push runs just ci; just absent → loud notice + docs-lint.sh fallback; failure still blocks the push.
- **Verify**: bash -n scripts/install-git-hooks.sh && grep -q 'command -v just' scripts/install-git-hooks.sh && grep -q 'just ci' scripts/install-git-hooks.sh && grep -q 'docs-lint.sh' scripts/install-git-hooks.sh
- **Status**: ✅ DONE (verdict ok:true, reviews/task-3.md; merged 1c5aa9e)
- context: updated — pre-push = just ci with loud docs-lint fallback

### TASK 4 (Tier B, ⚪): Doc-gate guidance
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Parallel group**: [PARALLEL-GROUP: A]
- **Allowed**: skills/flows/SKILL.md, AGENTS.md
- **Contract**: .workflows/specs/task-4.spec
- **Bottleneck**: ⚪ STANDARD
- **What**: flows SKILL documents the diff-scope rule (doc-surface tasks add just docs to verify); AGENTS.md gains a one-liner justfile pointer within the 60-line budget.
- **Verify**: bash scripts/agents-lint.sh AGENTS.md && bash scripts/check-drift.sh && grep -q 'just docs' skills/flows/SKILL.md && grep -q 'justfile' AGENTS.md
- **Status**: ✅ DONE (verdict ok:true, reviews/task-4.md; merged 046a17d)
- context: updated — flows SKILL doc-gate rule + AGENTS.md justfile pointer

### TASK 5 (Tier B, ⚪): Release pre-work
- **Agent**: worker
- **Depends On**: TASK 2, TASK 3, TASK 4
- **Wave**: 3
- **Parallel group**: [PARALLEL-GROUP: SOLO]
- **Allowed**: CHANGELOG.md, package.json
- **Contract**: .workflows/specs/task-5.spec
- **Bottleneck**: ⚪ STANDARD
- **Contract**: .workflows/specs/t5-changelog-version-046.spec
- **What**: CHANGELOG entry for plan 046 (names agent-ci rejection as origin note) + version bump to 0.14.0.
- **Verify**: grep -q '"version": "0.14.0"' package.json && grep -q '046' CHANGELOG.md
- **Status**: ✅ DONE (fix round; verdict ok:true, reviews/task-5.md; merged 9f9ceeb)
- context: updated — CHANGELOG 046 entry + version 0.14.0 (fabricated-recipe first diff rejected pre-review)

(No verify/quality tasks in plan: `/next` verdict-gates every task automatically; `/review` is the final gate at SHIP.)

## Risks
- 🟠 TASK 2: the just-install step is the only new CI surface (single pinned action).
- 🟡 TASK 3: degradation path must stay loud — never a silent pass.

## Execution Notes
- DEVIATION: CI runs `ci-lite` (drift+docs+agents), not the full `just ci` — the suite reads gitignored .workflows live state and is red on fresh checkouts (bug-hunter BUG-2). Implication: full-suite CI parity needs the state-hardening follow-up plan.
- DEVIATION: scripts/flow-validate.mjs gained a CLI main — out-of-plan, owner-authorized 20261031 (bug-hunter BUG-4; the documented SKILL.md validate invocation was a silent no-op). Implication: flow-validate.mjs is now a maintained repo script (CLI + exports); future edits must keep both surfaces working.
- DEFERRED: suite state-hardening (BUG-2 root), CONTRACTS:1:1 cc-check failure, guard boundary-path artifact, tdd-gate absence — follow-up queue in reviews/fix-round.md.
- DISCOVERY: content-fact spec scenarios (prose claims about repo state) pass grep selectors while describing fiction — reviewer briefs need repo-truth cross-checks (fabricated-recipes class, caught pre-review).
