# Plan: Deterministic format checking + opt-in init formatter profiles

> Plan ID: 20261127-083
> Created: 2026-11-27
> Status: DONE

## Lifecycle
- Plan ID is assigned once at bootstrap: 083 is the next unused id after shipped 082 (`20261125-082-judge-content-binding`); never reuse a Plan ID.
- `/idea` and `/plan` refuse to overwrite a live plan (DRAFT/APPROVED/IN PROGRESS) — route it to `/review` (ship → `archive/done/`) or `/abort` (superseded) first.
- SHIP (`/review`, all tasks ✅) → set Status: DONE and move the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/20261127-083-formatter-gate/`.
- SHIP gate: run `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" archive-check <archive-target-dir>` before the bundle move — every declared Docs impact path must be updated and CHANGELOG must mention `20261127-083` (templates/PROPOSAL-FORMAT.md).
- `/abort` → Status: SUPERSEDED, bundle to `.workflows/archive/superseded/20261127-083-formatter-gate/` with reason.
- `.workflows/CONTEXT.md`, `docs/adr/`, `knowledge/`, and `LOG.md` are never archived — durable knowledge outlives every plan.

## Context
- Goal: add a deterministic, mechanical format check to pi-workflows itself, and let `/init` detect an owned formatter profile in a consumer project and offer it at the owner gate only.
- dprint is a pluggable formatter, not a linter (`.workflows/scout/20261127-083-formatter-gate.md:4-5`); CI's read-only `dprint check` exits 20 on unformatted files and supports `--list-different` (`.workflows/scout/20261127-083-formatter-gate.md:6-7`).
- `fmt --staged` / `--dirty` can touch files outside Allowed Changes and break branch-diff/tripwire evidence (`.workflows/scout/20261127-083-formatter-gate.md:8`); process plugins require checksums and run unsandboxed (`.workflows/scout/20261127-083-formatter-gate.md:9`).
- Native/plugin coverage spans TS/JS/JSON/JSONC, Markdown, TOML, Jupyter, Dockerfile, SQL, plus Ruff and shfmt wrappers; Rust's rustfmt plugin is deprecated in favor of an exec wrapper and Markdown formatting can rewrite validated fences (`.workflows/scout/20261127-083-formatter-gate.md:10-13`).
- Repo has no formatter: `package.json:1-29` has no scripts, `mise.toml:3-14` pins no formatter, `.mise/tasks/ci:6-9` and `ci-lite:6-8` run drift/docs/agents/tests, `.githooks/pre-commit:9-13` runs WIP + check-drift, root files need a `.workflows/tree.json` entry, and `tests/mise-tasks.test.ts` + `tests/tree-check.test.ts` pin those surfaces (`.workflows/scout/20261127-083-formatter-gate.md:16-24`).
- `scripts/docs-lint.sh` owns Markdown structure/prose/links/stamps/claim-to-gate/gen-docs/check-tree and `scripts/check-drift.sh` owns semantic drift; neither does source formatting (`.workflows/scout/20261127-083-formatter-gate.md:20-21`).
- `/init` already detects stack from build manifests and generates real `check`/`verify` commands and deterministic mise wrappers via `buildInitMiseFragment()` (`.workflows/scout/20261127-083-formatter-gate.md:27-29`); `templates/DOCS-POLICY.md:96-97` forbids baked languages, so profiles are detection + owner approval (`.workflows/scout/20261127-083-formatter-gate.md:30`).
- Owner decisions: repo gate + opt-in `/init` offer for any detected language with a deterministic formatter profile, Rust and Python first-class, Markdown excluded, Rust prefers `cargo fmt --check`, Python prefers Ruff, and no formatter file is written without explicit owner approval (`.workflows/scout/20261127-083-formatter-gate.md:33-38`).

## Sieve

| Cell | Verdict |
|---|---|
| V value | valuable |
| R risk | contained |
| E effort | s |
| path | inspect |

Outcome: propose. The scout artifact is the inspection evidence.

## Decisions

- **dprint is a mechanical read-only check gate**: it never substitutes for reviewer judgment and no worker auto-formats outside an explicitly contracted formatting task.
  - `Cost of inaction:` style drift stays invisible until a human argues about it, or silent rewrites corrupt branch-diff evidence.
  - `Blast radius:` + repo gate/task surfaces and tests; − reviewer judgment and worker edit freedom; neutral existing docs-lint and check-drift semantics.
- **Repo scope matches this repo’s source formats (TS/JS/MJS/JSON); consumer profiles are language-agnostic**: root `dprint.json`, CLI pinned in `mise.toml`, `.mise/tasks/format-check` (read-only `--list-different`) and optional `.mise/tasks/format`; Markdown excluded; no exec/process plugins in this repo; `ci` and `ci-lite` include `format-check`; pre-commit runs a staged read-only check; tree manifest gains `dprint.json`; tests pin task and root-file surfaces.
  - `Cost of inaction:` no deterministic repo gate, or an unplanned formatter rewrites Markdown the docs-lint gate already validated; consumer projects keep reinventing tool-specific checks.
  - `Blast radius:` + mise/tasks/hook/tree/test files and init profile registry; − Markdown and unconditional consumer writes; neutral `scripts/docs-lint.sh` and `scripts/check-drift.sh`.
- **Consumer formatter profiles are detected, never baked**: `/init` maps build markers and existing formatter config to a deterministic profile registry and offers it at the owner gate; examples: TS/JS/JSON → dprint typescript/json, Python → Ruff (native or dprint Ruff wrapper), Rust → `cargo fmt --check` preferred and dprint exec only if the owner explicitly wants a single dprint surface, shell → shfmt, TOML/SQL/Jupyter/Dockerfile → dprint plugins where deterministic; Markdown excluded.
  - `Cost of inaction:` universal language assumptions and silent formatter writes violate `templates/DOCS-POLICY.md:96-97` and surprise owners.
  - `Blast radius:` + init extraction/profile lint and tests; − repo dprint config; neutral owner approval authority.
- **Missing tool is a loud skip, never a pass**: a detected profile whose formatter is absent reports SKIP with the reason; no profile is invented from a language guess and no `fmt` runs without owner approval.
  - `Cost of inaction:` a green gate that never ran is worse than no gate and hides toolchain breakage.
  - `Blast radius:` + profile lint and init offer wording; neutral gate verdict semantics.
- **Gate timing is fixed**: workers run the scoped read-only check in Verify; only an explicitly contracted formatting task may `fmt` explicit paths; reviewers consume recorded output and never re-derive or repair it; `/review` Stage 1 runs the whole-tree check.
  - `Cost of inaction:` per-task verdicts diverge from the integrated whole and formatting edits leak across Allowed Changes.
  - `Blast radius:` + init/reviewer/review doctrine and prompt tests; − no new verification tasks (verdict gating stays automatic).
- **docs-lint remains authoritative for Markdown**: this plan adds no Markdown formatter and does not replace structure/prose/link/stamp checks; docs baseline regenerates only through its gate script.
  - `Cost of inaction:` dprint's Markdown plugin or a second checker rewrites validated fences and produces two conflicting authorities.
  - `Blast radius:` + docs/canon and docs-lint baseline; − Markdown enforcement semantics; neutral SHIP archive rules.

## Exploration

- Done: `.workflows/scout/20261127-083-formatter-gate.md` is the facts-on-disk artifact; every Context claim above cites it.
- No live plan was overwritten (`.workflows/plan.md` is absent) and no implementation has started.
- No ADR/decision-index record is opened: these decisions are plan-local; an owner-approved standing rule can be recorded at SHIP if the repo gate becomes a durable contract.

## Refactor assessment

- **Scan**: extend existing surfaces — `mise.toml`, `.mise/tasks/{ci,ci-lite}`, `.githooks/pre-commit`, `.workflows/tree.json`, and their pinned tests for the repo gate; `scripts/init-extract.ts` + `buildInitMiseFragment()` and `skills/init/SKILL.md` for detection/offer; `agents/reviewer.md` + `skills/review/SKILL.md` for gate timing; existing `scripts/docs-lint.sh` remains Markdown authority. No new verification framework, no copied scripts, no second Markdown checker.
- **Verdict**: `extend`.
- **Block rule**: if Markdown needs dprint rewriting, a process plugin becomes mandatory in the repo gate, or consumer writes become unconditional, stop and escalate to the owner — do not absorb the overlap silently.

## Docs impact

- `README.md` — document `format-check` and optional `format`, read-only gate semantics, and Markdown exclusion.
- `docs/architecture.md` — add the format gate to the verification surface and show its position relative to check-drift/docs-lint.
- `docs/canon.md` — name docs-lint as the sole Markdown authority; format check excludes Markdown.
- `skills/init/SKILL.md` — detected formatter profiles, owner-gated offer, and loud-skip wording.
- `agents/reviewer.md` — consume recorded scoped check output; no auto-format; `/review` Stage 1 whole-tree check.
- `skills/review/SKILL.md` — Stage 1 whole-tree format check and Markdown boundary.
- `scripts/docs-lint-baseline.json` — regenerate only through the docs-lint gate.
- Test surfaces: `tests/mise-tasks.test.ts`, `tests/tree-check.test.ts`, `tests/init-extract.test.ts`, `tests/profile-lint.test.ts`, `tests/prompt-doctrine.test.ts`.
- `dprint.json`, `.mise/tasks/format-check`, and `.mise/tasks/format` are mechanical surfaces owned by TASK 1, not docs.
- CHANGELOG: SHIP-only entry with Plan ID `20261127-083` and next package version; no worker task edits CHANGELOG.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | `tdd:` Repo dprint gate | 🔴 BLOCKING | example-based | 1 | — |
| TASK_2 | worker | `tdd:` Init formatter profile detection/offer | 🟠 VERIFICATION_HEAVY | example-based | 1 | — |
| TASK_3 | worker | `tdd:` Gate-timing doctrine + docs | ⚪ STANDARD | example-based | 2 | TASK 1, TASK 2 |
| TASK_4 | worker | Final integration cleanup | 🟠 VERIFICATION_HEAVY | example-based | 3 | TASK 1, TASK 2, TASK 3 |
| TASK_5 | worker | `tdd:` Whole-plan review fixes | 🟠 VERIFICATION_HEAVY | example-based | 4 | TASK 1, TASK 2, TASK 3, TASK 4 |
| TASK_6 | worker | SHIP sweep pin repair | ⚪ STANDARD | example-based | 5 | TASK 1-5 |

Wave 1 is `[PARALLEL-GROUP: A]` with disjoint Allowed Changes; Wave 2 runs after both. `/review` is the final gate; no separate verify/quality tasks.

## Tasks

### TASK 1 (Tier B 🔴 BLOCKING): Repo dprint gate
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-1.spec
- **Allowed**: mise.toml; dprint.json; .mise/tasks/format-check; .mise/tasks/format; .mise/tasks/ci; .mise/tasks/ci-lite; .githooks/pre-commit; .workflows/tree.json; tests/mise-tasks.test.ts; tests/tree-check.test.ts
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **tdd**: true
- **What**: RED first: tests pin the pinned dprint CLI, `format-check` as read-only `--list-different`, optional `format`, `ci`/`ci-lite` inclusion, staged read-only pre-commit check, `dprint.json` tree-manifest entry, and TS/JS/MJS/JSON-only scope with Markdown excluded and no exec/process plugins. GREEN: extend the existing mise/task/hook/tree surfaces accordingly. Any pre-existing unformatted source outside Allowed Changes is reported to the orchestrator, never edited; no Markdown and no CHANGELOG writes; no formatter config for consumer languages here.
- **Verify**: `mise exec -- dprint check --list-different && mise exec -- bash scripts/check-drift.sh && mise exec -- bun test tests/mise-tasks.test.ts tests/tree-check.test.ts`
- **Status**: ✅ DONE

### TASK 2 (Tier B 🟠 VERIFICATION_HEAVY): Init formatter profile detection/offer
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-2.spec
- **Allowed**: scripts/init-extract.ts; scripts/profile-lint.sh; tests/init-extract.test.ts; tests/profile-lint.test.ts
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **tdd**: true
- **What**: RED first: tests pin a deterministic detection helper/registry driven by build markers and existing formatter config (never a baked language list), the owner-gate offer, and loud SKIP on a missing tool. Profile coverage: TS/JS/JSON → dprint typescript/json; Python → Ruff native or dprint Ruff wrapper; Rust → `cargo fmt --check` preferred, dprint exec only on explicit owner request for one dprint surface; shell → shfmt; TOML/SQL/Jupyter/Dockerfile → dprint plugins where deterministic; Markdown excluded. GREEN: extend init extraction and `profile-lint.sh`; no schema change unless tests require it; no universal writes and no formatter file written before owner approval. Do not touch repo `mise.toml`, `dprint.json`, or docs.
- **Verify**: `bun test tests/init-extract.test.ts tests/profile-lint.test.ts && mise exec -- bash scripts/check-drift.sh`
- **Status**: ✅ DONE

### TASK 3 (Tier B ⚪ STANDARD): Gate-timing doctrine + docs
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **Contract**: .workflows/specs/task-3.spec
- **Allowed**: skills/init/SKILL.md; agents/reviewer.md; skills/review/SKILL.md; README.md; docs/architecture.md; docs/canon.md; scripts/docs-lint-baseline.json; tests/prompt-doctrine.test.ts
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **tdd**: true
- **What**: RED first: prompt-doctrine tests pin gate timing — worker Verify runs the scoped read-only check, only an explicitly contracted formatting task may `fmt` explicit paths, reviewers consume recorded output, pre-commit is staged/read-only, and `/review` Stage 1 runs the whole-tree check — plus Markdown exclusion with docs-lint authoritative. GREEN: update the four docs/prompt surfaces, regenerate the docs-lint baseline only through its gate script, and keep README/canon claims aligned with TASK 1 and TASK 2 evidence. No CHANGELOG entry, no new verification task, no dprint config edit.
- **Verify**: `bun test tests/prompt-doctrine.test.ts && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

### TASK 4 (Tier B 🟠 VERIFICATION_HEAVY): Final integration cleanup
- **Agent**: worker
- **Wave**: 3
- **Depends On**: TASK 1, TASK 2, TASK 3
- **Contract**: .workflows/specs/task-4.spec
- **Allowed**: README.md; skills/init/SKILL.md; scripts/**; tests/**; extensions/**; package.json; dprint.json; scripts/docs-lint-baseline.json; .workflows/tree.json
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **What**: Explicit repo-wide formatting task: run dprint fmt on its declared TS/JS/MJS/JSON includes, repair stale pins broken by landed formatter config and docs, update the wf-launcher mise.toml hash, remove the raw docs-lint invocation from init doctrine, update the changelog pin test to the current release entry, and restore docs-lint budgets without hand-editing generated baselines. No CHANGELOG/package-version edit, no Markdown formatting, no behavior change.
- **Verify**: `mise exec -- dprint check --list-different && bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

### TASK 5 (Tier B 🟠 VERIFICATION_HEAVY): Whole-plan review fixes
- **Agent**: worker
- **Wave**: 4
- **Depends On**: TASK 1, TASK 2, TASK 3, TASK 4
- **Contract**: .workflows/specs/task-5.spec
- **Allowed**: .githooks/pre-commit; scripts/init-extract.ts; scripts/profile-lint.sh; skills/init/SKILL.md; agents/worker.md; tests/init-extract.test.ts; tests/profile-lint.test.ts; tests/prompt-doctrine.test.ts; tests/final-integration.test.ts
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **tdd**: true
- **What**: Close whole-plan review findings: pre-commit staged check respects dprint excludes and checks staged bytes; npm-pinned dprint plugins detected; JSONC trailing commas tolerated; profile lint rejects write-style formatter commands; worker Verify rule lives in agents/worker.md. No new dependency or behavior surface.
- **Verify**: `mise exec -- dprint check --list-different && bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

### TASK 6 (Tier B ⚪ STANDARD): SHIP sweep pin repair
- **Agent**: worker
- **Wave**: 5
- **Depends On**: TASK 1, TASK 2, TASK 3, TASK 4, TASK 5
- **Contract**: .workflows/specs/task-6.spec
- **Allowed**: tests/chooser-wiring.test.ts; tests/final-integration.test.ts; tests/mise-tasks.test.ts; tests/prompt-doctrine.test.ts; tests/flow-gates-mise.test.ts; tests/format-chooser.test.ts; tests/archive-drift.test.ts; tests/extension.test.ts; tests/wip.test.ts
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **What**: Update stale SHIP-owned assertions after the orchestrator sweep: release entry/version, docs baseline history exception, and plan-history filters. Preserve all behavior guards; no docs/config/source/history edits.
- **Verify**: `mise exec -- dprint check --list-different && bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

## Contracts (generated after approval)

| Task | Contract File | Scenarios |
|------|---------------|-----------|
| TASK 1 | .workflows/specs/task-1.spec | 5 scenarios |
| TASK 2 | .workflows/specs/task-2.spec | 5 scenarios |
| TASK 3 | .workflows/specs/task-3.spec | 5 scenarios |
| TASK 4 | .workflows/specs/task-4.spec | 5 scenarios |
| TASK 5 | .workflows/specs/task-5.spec | 5 scenarios |
| TASK 6 | .workflows/specs/task-6.spec | 4 scenarios |

## Ledger Resolution

Queue empty — the last ship report (`.workflows/archive/done/20261125-082-judge-content-binding/closeout-report.md`) declares no deferred items and has no open follow-up rows.

| Item | Disposition | Note |
|------|-------------|------|

- TASK 1: ok:true (scoped-green) · verdict `.workflows/reviews/task-1.md`; named blockers deferred to cleanup task.
  context: no changes.
  context: no changes.
- TASK 2 round 1: ok:false · verdict `.workflows/reviews/task-2.md`.
  context: no changes.
  context: no changes.
- TASK 2 fix round 2: ok:true · 31 pass / 0 fail · verdict `.workflows/reviews/task-2.md`.
- TASK 3: ok:true · verdict `.workflows/reviews/task-3.md`; scoped-green with cleanup blockers named.
  context: no changes.
  context: no changes.
- Final integration blockers found after wave 2; TASK 4 added as explicit formatting/pin cleanup before /review.
- TASK 3: ok:true · verdict `.workflows/reviews/task-3.md`.
  context: no changes.
  context: no changes.
- TASK 4 rounds 1-3: ok:false → ok:false → ok:true · verdict `.workflows/reviews/task-4.md`; final pinned suite 893 pass / 0 fail.
- Whole-plan review: CHANGES_REQUESTED; TASK 5 added for hook, detector, lint, and worker-rule fixes before SHIP.
- TASK 5: ok:true · verdict `.workflows/reviews/task-5.md`; final suite 898 pass / 0 fail.
  context: no changes.
- SHIP docs sweep exposed stale release/history pins; TASK 6 added for test-only pin repair.
- TASK 6 rounds 1-4: ok:false → ok:true · verdict `.workflows/reviews/task-6.md`; final suite 902 pass / 0 fail.
## Execution Notes
- Drafted from `.workflows/scout/20261127-083-formatter-gate.md` and the owner batch decisions; Sieve answer valuable / contained / s / inspect → propose.
- lessons: none applied — no formatter/dprint lesson is on record in `.workflows/lessons/lessons.jsonl` at draft time.
- Wave 1 runs TASK 1 + TASK 2 in parallel with disjoint Allowed Changes; Wave 2 runs TASK 3; `/review` is the final gate; SHIP owns the CHANGELOG entry, version alignment, and archive.
- Every build task carries `tdd:` and gets explicit `Test:` selectors in its generated spec; contracts are parse-linted and selector-linted before the approval ask.
- No model marks its own work done: ✅ comes only from a reviewer verdict; rejections trigger bounded fix rounds.
