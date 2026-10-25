# Plan: code-contracts durable rules layer (@cc + CONTRACTS) for pi-workflows

> Plan ID: 20260919-010
> Created: 2026-09-19
> Status: DONE (SHIPPED 2026-09-19 → v0.6.0, commit 72225ea)

## Lifecycle
- Plan ID assigned once: NNN = max archived (20260822-009) + 1 = 010.
- SHIP → Status: DONE, bundle to `.workflows/archive/done/20260919-010-code-contracts/`.
- `.workflows/CONTEXT.md`, `docs/adr/`, `LOG.md` never archived.

## Context
- **Source proposal**: `.workflows/20260919-code-contracts-durable-rules.md` — APPROVED 2026-09-19 with all recommendations. Scope (b): CONTRACTS files + `@cc` on plan-task-touched declarations. Steps 1–4 are Jev-free; steps 5–6 are Jev-dependent and gated behind a trust-test prototype.
- **Supersede**: `20260918-improvements-jev-judgment-gates.md` SUPERSEDED same day; Jev usage flows only through this plan's wave-3/4 tasks.
- **Key constraints** (grounded):
  - `.spec`'s executable `Test:` gates remain the ONLY task-done authority — replacement explicitly rejected (proposal comparison table; CONTEXT.md 2026-09-19 decision).
  - Reviewer stays "no judgment, no opinions" (agents/reviewer.md:6) — cc-check rides as a mechanical Layer 3 check, skipped when absent (pattern precedent: tdd-guard "skipped (not installed)", reviewer.md Layer 2).
  - Layer 1b already means Boundary Guard (agents/reviewer.md) — do NOT reuse the number.
  - dispatch-shapes.md:173-178 documents the burned round (ADR never read at spec/dispatch time) — the ADR-slices hand-summary gets REPLACED by `cc-check list`, not duplicated.
  - Jev never flips verdicts; advisory flags route to the human (standing rule, CONTEXT.md 2026-09-19).
  - cc-check is third-party/young → pin version, read-only usage, no vendoring (proposal decision 4).
- **Key decisions**: proposal decisions 1–4, recorded verbatim in the proposal's Status block and CONTEXT.md `## Decisions (2026-09-19, proposal round)`.

## Exploration
Inline-drafted (value-matrix ruling, plan-009 precedent: design fully determined by the approved proposal; scout work = this session's two-repo inspection, cited inline above and in the proposal). Adversarial self-pass applied: single-surface inventory (cc-check list replaces ADR-slices; Layer 3 not a new 1b; `.spec` section references IDs, creates no second boundary authority), per-task tier check, seam check (worker rule ↔ CONTRACT-FORMAT section name coupling: task 4 names the exact section title task 5 creates).

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK 1 | worker (orchestrator-inline, Tier A) | README requirements: pinned cc-check install | ⚪ STANDARD | — (grep) | 0 | — |
| TASK 2 | worker | Reviewer Layer 3: cc-check format gate | ⚪ STANDARD | grep + drift | 1 | TASK 1 |
| TASK 3 | worker | Dispatch packs: cc-check list replaces ADR-slices | ⚪ STANDARD | grep + drift | 1 | TASK 1 |
| TASK 4 | worker | Worker rule: @cc on new/changed public seams + adr: attribute | ⚪ STANDARD | grep + drift | 1 | TASK 1 |
| TASK 5 | worker | CONTRACT-FORMAT: `## Applicable contracts` + writing rules; plan skill Phase 5 | ⚪ STANDARD | grep + drift | 1 | TASK 1 |
| TASK 6 | worker | Dogfood: repo CONTRACTS + @cc on extension seams | ⚪ STANDARD | tool e2e (cc-check format rc0) | 1 | TASK 1 |
| TASK 7p | worker (prototype, Tier C) | Jev trust test: verdict replay → accuracy numbers → GO/NO-GO | 🟡 RISKY | evidence criteria | 2 | TASK 2 |
| TASK 8 | worker | quality-reviewer advisory Jev compliance step | 🟠 VERIFICATION_HEAVY | grep + drift | 3 | TASK 7p GO |
| TASK 9 | worker | Extension supersede watchdog (mechanical trigger + advisory routing) | 🟠 VERIFICATION_HEAVY | example-based (unit) | 3 | TASK 7p GO, TASK 6 |
| TASK 10 | worker (cheap dispatch) | README flow section + CHANGELOG entry | ⚪ STANDARD | grep | 4 | TASK 2–6 |

Wave discipline: wave 1 = PARALLEL-GROUP A (tasks 2–6, disjoint Allowed Changes). 7p serial (Tier C, never in a group). Wave 3 = PARALLEL-GROUP B (8, 9 — disjoint: quality-reviewer.md vs extensions/index.ts + tests). If 7p = NO-GO: tasks 8–9 dropped, plan ships steps 1–4 only (already independently valuable), Jev dormant.

**Human dependency for wave 2+**: a Jev key (`/typesafe enable` or TYPESAFE_API_KEY) — needed before 7p dispatch, not before wave 1.

## Tasks

### TASK 1: README requirements — pinned cc-check install (Tier A, orchestrator-inline)
- **Agent**: orchestrator (inline — no dispatch; round-trip costs more than the edit)
- **Depends on**: none
- **Bottleneck**: ⚪ STANDARD
- **What**: README.md Requirements section gains one line: global install `@spolu/cc-check` with pinned version + one-line purpose (syntax gate + contract listing for dispatch packs; read-only; never judges compliance). Also the actual `npm install -g` so tasks 2–6 can execute their Verify lines.
context: README.md (Optional tooling section)
- **Verify**: grep -q 'cc-check' README.md && command -v cc-check
- **Status**: ✅ DONE (2026-09-19, orchestrator-inline: @spolu/cc-check@0.2.0 installed globally, README Optional section entry added)
- **Verdict**: ok: true (orchestrator-executed Verify, Tier A grep-only tier: `grep -q 'cc-check' README.md` ✓ && `command -v cc-check` → ~/.npm-global/bin/cc-check ✓; committed 1ad5d2d)

### TASK 2: Reviewer Layer 3 — cc-check format gate
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-cc-format-gate.spec
context: agents/reviewer.md (Layer pipeline + tdd-guard skip wording)
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: grep-based
- **What**: agents/reviewer.md Layer 3 (Project Toolchain) gains optional check `cc-check format` — pass/fail/skipped(when no @cc/CONTRACTS in repo or tool absent), mirroring the tdd-guard skip pattern; report line in the verdict template's Layer 3 block.
- **Verify**: agent-spec lifecycle .workflows/specs/task-cc-format-gate.spec --code .
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-2.md; merged --no-ff 9dc5c6e)

### TASK 3: Dispatch packs — cc-check list replaces ADR-slices
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-cc-dispatch-pack.spec
context: agents/dispatch-shapes.md (ADR-slices rule ~L173)
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: grep-based
- **What**: agents/dispatch-shapes.md — the ADR-slices rule (lines ~173–178) becomes: pack carries `cc-check list` output for the task's files (exact, mechanical); one-line ADR summary ONLY as fallback when a governing ADR exists but no `adr:`-attributed contract covers the seam yet; never rely on "read CONTEXT.md". No second path — the hand-summary is the fallback, not a parallel mechanism.
- **Verify**: agent-spec lifecycle .workflows/specs/task-cc-dispatch-pack.spec --code .
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-3.md; merged --no-ff 3fd4ba9)

### TASK 4: Worker rule — @cc on new/changed public seams
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-cc-worker-seams.spec
context: agents/worker.md; templates/CONTRACT-FORMAT.md
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: grep-based
- **What**: agents/worker.md gains the seams rule: public functions/classes created or changed within Allowed Changes carry `@cc` invariants (one directive per invariant, stable ID, extensible `adr:` attribute when a governing ADR exists); durable invariants only — never per-task ephemera (that stays in `.spec`). Example block included. Names the section title created by TASK 5 (`## Applicable contracts`) for cross-reading.
- **Verify**: agent-spec lifecycle .workflows/specs/task-cc-worker-seams.spec --code .
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-4.md; merged --no-ff a30ea72)

### TASK 5: CONTRACT-FORMAT — `## Applicable contracts` + writing rules
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-cc-spec-section.spec
context: templates/CONTRACT-FORMAT.md; skills/plan/SKILL.md Phase 5
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: grep-based
- **What**: templates/CONTRACT-FORMAT.md gains the optional `## Applicable contracts` section (machine-generated `cc-check list` IDs for the task's files; references rules, never re-states them — no second authority) + contract writing rules for @cc (IDs stable, adr: attribute, invariants not ephemera). skills/plan/SKILL.md Phase 5 gains one line: populate the section when contracts exist in the repo.
- **Verify**: agent-spec lifecycle .workflows/specs/task-cc-spec-section.spec --code .
- **Status**: ✅ DONE (2026-09-19, round-1 ok:false on spec-selector artifacts → selectors amended per plan-006 precedent → fix-round-1 ok:true — full chain reviews/task-5.md; commit 36f25df legitimised on master)

### TASK 6: Dogfood — repo CONTRACTS + @cc on extension seams
- **Agent**: worker
- **Depends on**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-cc-dogfood.spec
context: extensions/index.ts doc comments; cc-check grammar (README @spolu/cc-check)
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: tool e2e
- **What**: CONTRACTS file at repo root with 3–5 REAL repo rules (verbatim from existing doctrine: role substitution is mechanical; reviewer verdicts never contain judgment; verdict gating = reviewer-only authority; watchdogs remind once per gap). `@cc` on extensions/index.ts exported functions (roleBody, watchdog entry points) with invariants taken from their existing doc comments. Proves the format on ourselves before recommending to consumers.
- **Verify**: cc-check format (rc 0, repo root) && agent-spec lifecycle .workflows/specs/task-cc-dogfood.spec --code .
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-6.md; merged --no-ff 57b71a8; repo now carries 4 CONTRACTS doctrine rules + 2 seam contracts)

### TASK 7p: Jev trust test — verdict replay (prototype)
- **Agent**: worker (prototype; @model:strong, thinking high, serial)
- **Depends on**: TASK 2 (question shapes reference the Layer 3 gate context); **HUMAN**: Jev key provided + `/typesafe enable`
- **Contract**: .workflows/specs/task-jev-trust-prototype.spec
context: .workflows/reviews/*.md + archive reviews/ (ground truth); CONTRACTS (rules); spike requests/ shapes
- **Bottleneck**: 🟡 RISKY
- **Testing strategy**: evidence criteria (prototype)
- **What**: Bounded question: "do Jev's answers on @cc-compliance and ADR-consistency question shapes agree with what actually happened?" Replay N≥10 old tasks (verdict files from `.workflows/reviews/` + archive `reviews/`) through the step-5 question shapes via typesafe_evaluate; record per-question correctness vs the recorded outcome; propose advisory thresholds (act-below/ask-above). POC in `.workflows/spikes/jev-trust/**` — zero production files. Output: GO/NO-GO with numbers.
- **Verify**: spike artifact exists with per-question accuracy table + GO or NO-GO verdict citing file:line evidence
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-7p.md; spike verdict **GO advisory-only**: 43/43 100%, 0 FP/FN, caveats on record; thresholds noul 0.85/choice 0.90 carried UNTESTED; T8/T9 specs drafted from this verdict per two-stage rule)

### TASK 8: quality-reviewer — advisory Jev compliance step (conditional: 7p GO)
- **Agent**: worker
- **Depends on**: TASK 7p GO
- **Parallel group**: [PARALLEL-GROUP: B]
- **Contract**: .workflows/specs/task-jev-quality-step.spec
context: agents/quality-reviewer.md (P0-P3 rubric, check #5, Verdict template); spike report thresholds — **spec DEFERRED until 7p verdict** (two-stage rule; evidence = verdict + spike artifacts + chosen thresholds)
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: grep-based
- **What**: agents/quality-reviewer.md gains an advisory layer: one batched typesafe_evaluate over the task diff — per touched contract a Noul compliance question, per governing ADR a Choice (consistent/contradicts/supersedes/unrelated). Flags surface in the report under the existing Domain/ADR-fit check; block nothing; thresholds from 7p. Skipped silently when no contracts/ADR govern the diff or typesafe unavailable.
- **Verify**: agent-spec lifecycle .workflows/specs/task-jev-quality-step.spec --code .
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-8.md; merged --no-ff 0926541; advisory-only, thresholds carried UNTESTED per 7p verdict)

### TASK 9: Extension supersede watchdog (conditional: 7p GO)
- **Agent**: worker
- **Depends on**: TASK 7p GO, TASK 6
- **Parallel group**: [PARALLEL-GROUP: B]
- **Contract**: .workflows/specs/task-supersede-watchdog.spec
context: extensions/index.ts (@cc contracts from T6); tests/extension.test.ts patterns; CONTRACTS watchdog-remind-once — **spec DEFERRED until 7p verdict**
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based (unit tests in tests/extension.test.ts)
- **What**: extensions/index.ts gains the mechanical trigger: task diff touches an `adr:`-attributed contract's file, or a spec's `Decisions:` changed while no new ADR file exists → inject one advisory line naming the seam + the Jev supersede question's probability (routing only). Never edits, never gates; remind-once discipline like the existing watchdogs. Unit tests: trigger fires/not-fires matrix, no-spam, typesafe-unavailable → static line only.
- **Verify**: bun test tests/ && agent-spec lifecycle .workflows/specs/task-supersede-watchdog.spec --code .
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-9.md; merged --no-ff 088a3c2; extension stays pure-mechanical, Jev probability orchestrator-side)

### TASK 10: Docs — README flow + CHANGELOG
- **Agent**: worker (cheap dispatch per registry)
- **Depends on**: TASK 2–6
- **What**: README "How it works" gains a short "Durable rules (code contracts)" paragraph pointing at the proposal decisions; CHANGELOG entry at SHIP (per DOCS-POLICY).
- **Verify**: grep -q 'code contracts' README.md
- **Status**: ✅ DONE (2026-09-19, verdict ok:true — reviews/task-10.md; commit 7a98998 direct per reviewer instruction)
context: README.md How-It-Works section conventions

(No verify/quality tasks as plan tasks — `/next` verdict-gates every task; `/review` is the SHIP gate.)

## Contracts (generated after approval)

| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 2 | .workflows/specs/task-cc-format-gate.spec | 3 |
| TASK 3 | .workflows/specs/task-cc-dispatch-pack.spec | 3 |
| TASK 4 | .workflows/specs/task-cc-worker-seams.spec | 4 |
| TASK 5 | .workflows/specs/task-cc-spec-section.spec | 4 |
| TASK 6 | .workflows/specs/task-cc-dogfood.spec | 4 |
| TASK 7p | .workflows/specs/task-jev-trust-prototype.spec | 4 (evidence criteria) |
| TASK 8 | deferred until 7p verdict | — |
| TASK 9 | deferred until 7p verdict | — |

Pre-dispatch git-dirty whitelist: `M .workflows/LOG.md`, `M .workflows/plan.md`, `?? .workflows/specs/*.spec`, plus this plan's own artifacts.

## Execution notes
- TASK 1 inline at first `/next` (Tier A rule).
- 7p dispatch blocks on the Jev key — if absent, `/next` runs wave 1 then parks with a HELP line, not a guess.
- NO-GO path: 8/9 dropped, `/review` ships steps 1–4, Jev dormant, spike archived as evidence.
