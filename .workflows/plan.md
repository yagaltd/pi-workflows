# Plan: Wire Rust structural gate and crate-architecture skill

> Plan ID: 20261124-081
> Created: 2026-11-24
> Status: IN PROGRESS

## Lifecycle
- Plan ID is assigned once at bootstrap: NNN = (entries in `.workflows/archive/done` + `.workflows/archive/superseded`) + 1, zero-padded to 3. Never reuse a Plan ID.
- `/idea` and `/plan` refuse to overwrite a live plan (DRAFT/APPROVED/IN PROGRESS) — route it to `/review` (ship → `archive/done/`) or `/abort` (abandon → `archive/superseded/`) first.
- SHIP (`/review`, all tasks ✅) → set Status: DONE and move the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/20261124-081-rust-structural-gate/`.
- SHIP gate: run `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" archive-check <archive-target-dir>` before the bundle move — a missing declared Docs impact path or a CHANGELOG without the Plan ID refuses the archive (templates/PROPOSAL-FORMAT.md).
- `/abort` → Status: SUPERSEDED, bundle to `.workflows/archive/superseded/20261124-081-rust-structural-gate/` with reason.
- `.workflows/CONTEXT.md`, `docs/adr/`, `knowledge/`, `LOG.md` are never archived — durable knowledge outlives every plan.

## Context
- Goal: wire `deslop-please` as a structural gate and `rust-crate-architecture` as the Rust crate-boundary/layer skill for Rust projects only, in greenfield and brownfield (`/init --adopt`) paths; every non-Rust project stays byte-identical (scout: `agents/reviewer.md:156-167`, `skills/init/SKILL.md:95-119`, `scripts/init-extract.ts:205-243`).
- The reviewer already has a Rust skill-family slice (`rust-review`, `rust-best-practices`, `rust-port`) to extend with `rust-crate-architecture`, not a new heading to invent (scout: `agents/reviewer.md:156-167`; accretion pins `tests/prompt-doctrine.test.ts:1351-1370,1427-1466`).
- `rust-crate-architecture` is installed at `~/.agents/skills/rust-crate-architecture/SKILL.md`; it reads `cargo metadata`/`cargo tree`, defines the four-layer crate model, and defers manifest/module detail to companion skills. Its workspace gate adds `cargo metadata`, `cargo tree`, `cargo clippy`, and `cargo deny` commands (source: po4yka/rust-skills, BSD-3-Clause, 7 stars/3 forks).
- Brownfield extraction already detects `Cargo.toml` and records `{ stack: "Rust (cargo)", reviewSkills: [...] }`, and writes only `*.draft` files; an unknown top-level profile key is ignored by profile-lint, so a draft-only marker is safe. The Rust `reviewSkills` array must gain `rust-crate-architecture` (scout: `scripts/init-extract.ts:296-297,423-477`; `scripts/profile-lint.sh:108-124,153-167`).
- `deslop-please` is a Cargo-workspace CLI requiring `rust-analyzer scip`; exit 0 is clean, 1 is findings, 2 is tool/config error, and `--update-allow` is explicitly not wanted here (scout: `src/workspace.rs:46-58`, `src/indexing.rs:49-88`, `src/main.rs:145-151`, `src/main.rs:34-42`).
- Generated Rust `check` tasks are the enforcement point; the flow-gates parser accepts only flat double-quoted `check = "..."` lines, and review Layer 0 runs `mise run check && mise run verify` (scout: `skills/init/SKILL.md:165-183`, `scripts/flow-gates.mjs:123-137`, `skills/review/SKILL.md:36-46`).
- Constraints: no generated root allow file (`scripts/check-tree.mjs:43-58,60-77`), no installed-skill entry (no local deslop-please install evidence), docs baseline regenerates only via `bash scripts/docs-lint.sh --write-baseline` (`templates/DOCS-POLICY.md:54-60`), CHANGELOG is SHIP-only.

## Sieve

| Cell | Verdict |
|---|---|
| V value | must-have |
| R risk | serious |
| E effort | s |
| path | inspect |

Outcome: propose. The scout artifact is the inspection evidence; no further research path is needed (`path: inspect`).

## Decisions

- **Rust-only scope**: Every new insertion is conditional on cargo/Rust detection; non-Rust projects remain byte-identical in greenfield and adopt drafts.
  - `Cost of inaction:` accidental gate churn in TS/Python/other projects and a broken byte-identical guarantee; reviewers would see doctrine that does not apply.
  - `Blast radius:` + Rust detection paths + reviewer rules + init charter assembly + generated Rust check; − non-Rust projects and fixtures (byte-identical); neutral README/canon prose (conditioned, not baked language).
- **Canonical mandate verbatim**: Use exactly `Rust structural gate: run `deslop-please` before `/review`; fix findings from first principles — no allowlist churn; consult the Rust skill family (`rust-review`, `rust-best-practices`, `rust-port`, `rust-crate-architecture`).` in three placements: reviewer rules after the domain-skills nested bullets (not inside that slice), `skills/init/SKILL.md` Phase 5 step 1 for both greenfield and adopt charter assembly, and `templates/DOCS-POLICY.md` as a conditional domain gate rule. The universal `templates/AGENTS.md` carries only a generic conditional pointer; the literal sentence is injected by Rust charter assembly only.
  - `Cost of inaction:` the CLI stays unwired, agents treat deslop-please as optional advice, and BeautifulRUST-style wiring stays asymmetric.
  - `Blast radius:` + reviewer/init/template/docs tests; − non-Rust output (conditional); neutral installed-skill allowlist (no new entry).
- **Brownfield draft-only marker**: `scripts/init-extract.ts` adds an optional top-level `architectureGate` marker to `.workflows/profile.json.draft` only when `Cargo.toml` is detected and the resolved stack is Rust, and adds the canonical sentence to the charter draft when Rust; no schema change, no `commands`/`gates` change, no generated allow file.
  - `Cost of inaction:` adopt mode cannot surface the gate to the owner and the temptation is to add a schema field or allow file that the tree gate rejects.
  - `Blast radius:` + init-extract draft/charter assembly + init-extract tests; − `extensions/index.ts`, `scripts/profile-lint.sh`, `scripts/flow-gates.mjs`, generated allow files; neutral existing profile schema consumers (unknown top-level keys ignored).
- **Mechanical gate shape**: Generated Rust root `mise.toml` `[tasks] check` stays a flat one-line double-quoted TOML assignment chaining `cargo metadata`, `cargo tree`, `cargo clippy`, and the guarded `deslop-please` (plus `cargo deny` when installed); findings exit 1 fails check, and an absent optional tool prints a loud SKIP to stderr and continues.
  - `Cost of inaction:` no enforcement, a broken flow-gates parse, or a hard failure on machines without the optional tools.
  - `Blast radius:` + generated Rust check + flow-gates parser tests + review Layer 0; − non-Rust generated checks and `verify = "cargo test"`; neutral `scripts/flow-gates.mjs` (parser unchanged).
- **Two distinct artifacts**: deslop-please stays a CLI with no `INSTALLED_SKILLS` entry; `rust-crate-architecture` is an installed Pi skill and must be added to the Rust domain-skills list and the prompt-doctrine installed-skill allowlist.
  - `Cost of inaction:` reviewers miss the crate-boundary skill, or the allowlist lies about what is installed.
  - `Blast radius:` + reviewer wording + prompt-doctrine pins; + one installed skill in `INSTALLED_SKILLS`; − no deslop-please skill entry.
- **Docs baseline and history discipline**: Docs edits regenerate `scripts/docs-lint-baseline.json` only with `bash scripts/docs-lint.sh --write-baseline`; no hand-edited baseline; `CHANGELOG.md` is SHIP-only with Plan ID 20261124-081.
  - `Cost of inaction:` docs-lint ratchet drift, hidden debt, or history leaked into a worker diff.
  - `Blast radius:` + README/architecture/canon + baseline + docs-lint; − `CHANGELOG.md` in worker tasks; neutral archive gate at SHIP (it consumes the later entry).
- **TDD first**: All three tasks write failing tests before implementation; selectors pin the exact canonical sentence, the Rust/non-Rust fixture split, and the flat parse/SKIP behavior.
  - `Cost of inaction:` wording and behavior drift survive review because no red test ever pinned them.
  - `Blast radius:` + three test files; − production/docs edits before red; neutral contracts (selectors are authored after approval).

## Exploration

- Done: `.workflows/scout/20261124-081-rust-structural-gate.md` is the facts-on-disk artifact. Key anchors: reviewer Rust slice `agents/reviewer.md:156-167`; init Phase 5 step 1 `skills/init/SKILL.md:95-119`; generated mise rules `skills/init/SKILL.md:165-183`; extractor detection/draft boundaries `scripts/init-extract.ts:205-243,296-297,374-412,423-477`; profile/gate validation `scripts/profile-lint.sh:108-124,153-167`; parser `scripts/flow-gates.mjs:123-137`; docs baseline `templates/DOCS-POLICY.md:54-60`; tests `tests/prompt-doctrine.test.ts:315-345,521-558,616-629,694-706,1351-1370,1427-1466`, `tests/init-extract.test.ts:71-320`, `tests/mise-tasks.test.ts:106-125`, `tests/flow-gates-mise.test.ts:29-100`.
- Unknown: no local deslop-please install evidence; the gate must be optional-by-detection, not required-by-install.
- Inert by design: schema-only additions are whitelisted away by `adoptDraftOf` (`extensions/index.ts:4241-4251`), so the draft marker must stay draft-only.

## Refactor assessment

- **Scan**: This plan touches the existing BeautifulRUST mandate map (`agents/reviewer.md`, `skills/init/SKILL.md`), the adopt draft assembler (`scripts/init-extract.ts`), the template/policy surfaces (`templates/AGENTS.md`, `templates/DOCS-POLICY.md`), and the existing generated-gate/docs surfaces (`README.md`, `docs/architecture.md`, `docs/canon.md`, `scripts/docs-lint-baseline.json`, flow-gates/mise tests). Existing structure already covers Rust skill consultation, draft generation, flat `check` parsing, and docs debt accounting.
- **Verdict**: `extend` — extend the Rust slice, Phase 5 charter assembly, adopt draft, and generated check; add no new flow, gate script, skill entry, heading, or allow file.
- **Block rule**: If an overlap appears that contradicts `extend` (for example, a need for a new gate script or schema field), stop and escalate to the human; do not absorb it silently.

## Docs impact

- `agents/reviewer.md` — canonical sentence after the domain-skills nested bullets, and `rust-crate-architecture` added to the Rust domain-skills list; ≤170 lines and no new `##` heading.
- `skills/init/SKILL.md` — Phase 5 step 1 assembly for greenfield and adopt; Phase 5 step 7 generated Rust `check` string.
- `templates/AGENTS.md` — generic conditional pointer only; no literal Rust gate sentence in the universal template.
- `templates/DOCS-POLICY.md` — conditional domain gate rule with a gate reference.
- `README.md` — command-table section describes the generated Rust `check` chain and the Rust architecture skill family.
- `docs/architecture.md` — gates section records the Rust structural gate and its skip semantics.
- `docs/canon.md` — claim-to-gate mapping for the Rust structural gate.
- `scripts/docs-lint-baseline.json` — regenerated only with `bash scripts/docs-lint.sh --write-baseline`.
- CHANGELOG: SHIP-only — next release — Wire deslop-please as the Rust structural gate (Plan ID 20261124-081); no worker task edits `CHANGELOG.md`.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | `tdd:` Doctrine + charter wiring | 🔴 BLOCKING | example-based | 1 | — |
| TASK_2 | worker | `tdd:` Brownfield adopt draft wiring | ⚪ STANDARD | example-based | 1 | — |
| TASK_3 | worker | `tdd:` Docs + gates release | ⚪ STANDARD | example-based | 2 | TASK_1, TASK_2 |
| TASK_4 | worker | `tdd:` Final review integration fixes | 🟠 VERIFICATION_HEAVY | example-based | 3 | TASK_1, TASK_2, TASK_3 |

All three build tasks carry `tdd:`; every generated scenario must carry an explicit `Test:` selector before approval. Wave 1 is `[PARALLEL-GROUP: A]` (TASK_1 + TASK_2, disjoint Allowed Changes). Wave 2 is TASK_3 (docs + baseline after both wave-1 sources land).

## Tasks

### TASK 1 (Tier B 🔴 BLOCKING): Doctrine + charter wiring
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-1.spec
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **Flags**: `tdd:`
- **tdd**: true
- **Skills**: `rust-review`, `rust-best-practices`, `rust-port`, `rust-crate-architecture` (wording fidelity and crate-architecture commands; deslop-please is not a Pi skill)
- **Allowed**: agents/reviewer.md; skills/init/SKILL.md; templates/AGENTS.md; templates/DOCS-POLICY.md; tests/prompt-doctrine.test.ts
- **Forbidden**: no new `##` heading in `agents/reviewer.md`; reviewer.md ≤170 lines; no `INSTALLED_SKILLS` entry; no schema, gate, or command changes; no `CHANGELOG.md`.
- **What**: RED first: failing tests in `tests/prompt-doctrine.test.ts` pin the exact canonical sentence in four placements, the Rust domain-skills list including `rust-crate-architecture`, the installed-skill allowlist addition, reviewer line budget ≤170, no new `##` heading, and the Phase 5 step 7 Rust `check` string. GREEN: insert the sentence after the domain-skills nested bullets in `agents/reviewer.md` (not inside that slice), add `rust-crate-architecture` to the Rust domain-skills line; in `skills/init/SKILL.md` Phase 5 step 1, assemble the sentence for both greenfield and adopt charter paths and cite the four-skill family, and update Phase 5 step 7 so generated Rust `check` is a flat one-line guarded chain: `cargo metadata --locked --no-deps --format-version 1 >/dev/null`, `cargo tree --locked --workspace -e normal,build --target all`, `cargo clippy --locked --workspace --all-targets -- -D warnings`, optional `cargo deny --config deny.toml --locked check`, then guarded `deslop-please --allow .deslop-please.allow`; absent optional tools SKIP loudly and continue. Add PROJECT guidance in `templates/AGENTS.md` and a conditional domain gate rule in `templates/DOCS-POLICY.md` with a gate reference.
- **Verify**: `bun test tests/prompt-doctrine.test.ts && bash scripts/agents-lint.sh templates/AGENTS.md && git diff --check`
- **Status**: ✅ DONE

### TASK 2 (Tier B ⚪ STANDARD): Brownfield adopt draft wiring
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-2.spec
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **Flags**: `tdd:`
- **tdd**: true
- **Skills**: — (draft extraction only)
- **Allowed**: scripts/init-extract.ts; tests/init-extract.test.ts
- **Forbidden**: no `extensions/index.ts` schema change; no `scripts/profile-lint.sh` or `scripts/flow-gates.mjs` change; no generated allow file; no non-Rust fixture drift; no `CHANGELOG.md`.
- **What**: RED first: the Rust fixture (cargo detected, stack Rust) asserts `.workflows/profile.json.draft` gains a top-level draft-only `architectureGate` marker (`tool: deslop-please`, `requires: rust-analyzer`), `reviewSkills` contains `rust-crate-architecture`, and the charter draft carries the canonical sentence; the non-Rust fixture is byte-identical. GREEN: add the branch in `scripts/init-extract.ts` at the existing detection/charter-draft seams, gated on both cargo detection and resolved Rust stack; do not add a schema field, `commands`/`gates` entry, or generated allow file.
- **Verify**: `bun test tests/init-extract.test.ts && git diff --exit-code -- extensions/index.ts scripts/profile-lint.sh scripts/flow-gates.mjs && test ! -e .deslop-please.allow`
- **Status**: ✅ DONE

### TASK 3 (Tier B ⚪ STANDARD): Docs + gates release
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **Parallel group**: none
- **Contract**: .workflows/specs/task-3.spec
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **Flags**: `tdd:`
- **tdd**: true
- **Skills**: — (docs + gate tests only)
- **Allowed**: README.md; README*; docs/architecture.md; docs/canon.md; scripts/docs-lint-baseline.json; skills/init/SKILL.md; templates/DOCS-POLICY.md; tests/prompt-doctrine.test.ts; tests/mise-tasks.test.ts; tests/flow-gates-mise.test.ts
- **Forbidden**: no `CHANGELOG.md` edit in the worker task; no hand-edited baseline; no new gate script; no `scripts/flow-gates.mjs` parser change; no generated allow file.
- **What**: RED first: tests in `tests/mise-tasks.test.ts` and `tests/flow-gates-mise.test.ts` pin the flat `check = "..."` parse, the metadata → tree → clippy → optional deny → deslop-please chain, exit-1 failure, and loud stderr SKIP with continue when an optional tool is absent. GREEN: document the generated Rust check and four-skill Rust family in the README command-table section (`README.md:101-116`), architecture gates (`docs/architecture.md:75-116,256-261,349-357`), and canon claim-to-gate (`docs/canon.md:39-42`); regenerate `scripts/docs-lint-baseline.json` only with `bash scripts/docs-lint.sh --write-baseline`; leave CHANGELOG to SHIP.
- **Verify**: `mise exec -- bun test tests/mise-tasks.test.ts tests/flow-gates-mise.test.ts && mise exec -- bash scripts/docs-lint.sh --write-baseline && mise run docs && git diff --exit-code -- CHANGELOG.md`
- **Status**: ✅ DONE

### TASK 4 (Tier B 🟠 VERIFICATION_HEAVY): Final review integration fixes
- **Agent**: worker
- **Wave**: 3
- **Depends On**: TASK 1, TASK 2, TASK 3
- **Contract**: .workflows/specs/task-4.spec
- **Allowed**: extensions/index.ts; scripts/init-extract.ts; skills/init/SKILL.md; templates/AGENTS.md; README.md; README*; docs/architecture.md; scripts/docs-lint-baseline.json; tests/prompt-doctrine.test.ts; tests/init-extract.test.ts; tests/flow-gates-mise.test.ts; tests/mise-tasks.test.ts
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **tdd**: true
- **Skills**: `rust-crate-architecture` (gate semantics only)
- **What**: Close whole-plan review findings: live judge schema names the four-skill Rust family; generated Rust check does not pass a nonexistent allow file; Cargo.lock is bootstrapped before --locked commands; universal template carries no Rust-specific pointer. No new behavior surface.
- **Verify**: `mise exec -- bun test && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

## Contracts (generated after approval)

| Task | Contract File | Scenarios |
|------|---------------|-----------|
| TASK 1 | .workflows/specs/task-1.spec | 8 scenarios |
| TASK 2 | .workflows/specs/task-2.spec | 5 scenarios |
| TASK 3 | .workflows/specs/task-3.spec | 5 scenarios |
| TASK 4 | .workflows/specs/task-4.spec | 5 scenarios |

## Ledger Resolution

Queue empty — the last ship report has no follow-up rows to drain.

| Item | Disposition | Note |
|------|-------------|------|

- TASK 3: ok:true · 242.9k tokens / 28m20s (worker 146.2k/19m27s + reviewer 96.7k/8m53s) · verdict `.workflows/reviews/task-3.md`.
  context: updated.
- Whole-plan review: CHANGES_REQUESTED; TASK 4 added for four integration findings before SHIP.
- TASK 4 fix round 2: ok:true · 142.8k tokens / 23m02s (worker 71.9k/11m46s + reviewer 70.9k/11m16s) · verdict `.workflows/reviews/task-4.md`.
  context: updated.
## Execution Notes
- TASK 2: ok:true · 118.4k tokens / 5m36s (worker 67.5k/3m15s + reviewer 52.9k/2m21s) · verdict `.workflows/reviews/task-2.md`.
  context: no changes.
- TASK 1 round 1: ok:false · 148.0k tokens / 9m15s (worker 96.8k/5m34s + reviewer 51.2k/3m41s) · verdict `.workflows/reviews/task-1.md`.
  context: no changes.
- TASK 1 fix round 2: ok:true · 172.1k tokens / 9m44s (worker 98.7k/4m39s + reviewer 73.4k/5m05s) · verdict `.workflows/reviews/task-1.md`.
  context: no changes.
- TASK 1 fix round 3: ok:true · 152.8k tokens / 8m48s (worker 71.4k/3m49s + reviewer 81.4k/4m59s) · verdict `.workflows/reviews/task-1.md`.
  context: no changes.
- Adjudication: TASK 3 allowed surface expanded to repair task-1 boundary-test scope, README wildcard boundary artifact, and task-1 markdown/prose debt exposed by baseline regeneration. No behavior surface added.

- Drafted from `.workflows/scout/20261124-081-rust-structural-gate.md` plus installed `rust-crate-architecture` skill evidence; every Context claim carries a scout-anchored file:line or skill source.
- lessons: none applied — no lesson IDs were present in the scout facts supplied for this draft.
- Owner confirmed `rust-crate-architecture` is installed at `~/.agents/skills/rust-crate-architecture/SKILL.md` before plan drafting.
- Wave 0 is already complete (read-only scout). Wave 1 runs TASK_1 + TASK_2 as `[PARALLEL-GROUP: A]`; Wave 2 runs TASK_3 after both. `/review` remains the final tier-2 gate; SHIP owns the CHANGELOG entry and archive bundle.