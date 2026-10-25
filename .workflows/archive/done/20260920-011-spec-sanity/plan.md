# Plan: spec-sanity pre-pass — Layer A (mechanical) + Layer B (Jev, trust-gated)

> Plan ID: 20260920-011
> Created: 2026-09-20
> Status: DONE (SHIPPED 2026-09-20 → v0.6.1, commit dad0c9a; T3 dropped per T2 NO-GO)

## Lifecycle
- NNN = max archived (20260919-010) + 1 = 011.
- SHIP → DONE, bundle to `.workflows/archive/done/20260920-011-spec-sanity/`.

## Context
- **Source proposal**: `.workflows/20260920-spec-sanity-prepass.md` — APPROVED 2026-09-20 with all recommendations (both layers; specs only; Layer A mechanical; trust corpus as described).
- **Gap**: mechanical parse-lint catches syntax only; T5's two selector artifacts (grep window `-A6` too narrow; negative count unattainable at base) parsed fine, surfaced only after a burned worker round (reviews/task-5.md carries both original selectors verbatim — the negative-corpus source).
- **Constraints**:
  - Workers stay Jev-free (verdict-gating doctrine; code-review confirmed 2026-09-20).
  - Pre-pass flags ride the human approval gate — Jev never auto-blocks a dispatch.
  - Thresholds come from THIS trust replay; no carry-over from the v0.6.0 compliance/supersede shapes.
  - Post-approval specs frozen — the pre-pass runs once at Phase 5.
  - Jev calls are orchestrator-side (children build payloads; orchestrator executes — the 7p pattern).

## Exploration
Inline-drafted (value-matrix ruling: design fully proposal-determined; corpus sources verified on disk — archived specs + reviews/ verdict files). Adversarial pass: Layer A must NOT try to run selectors (they describe post-work end state — only parse/flag sanity); Layer B state carries the spec text verbatim (no ground-truth leak — same discipline as the 7p requests); T3 wiring touches prompts/idea.md too (its Phase 6 also generates contracts — same pre-pass rule needed there or the gate has a hole).

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK 1 | worker | Layer A: selector syntax check script + Phase 5 wiring | ⚪ STANDARD | example-based | 1 | — |
| TASK 2 | worker (prototype) | Trust extension: spec-sanity replay → thresholds → GO/NO-GO | 🟡 RISKY | evidence criteria | 2 | — |
| TASK 3 | worker | Layer B: Jev pre-pass wiring (plan skill + idea prompt) | ⚪ STANDARD | grep + drift | 3 | TASK 2 GO |
| TASK 4 | orchestrator (+cheap dispatch) | README line + CHANGELOG at SHIP | ⚪ STANDARD | grep | 4 | TASK 1–3 |

NO-GO path: T3 dropped; Layer A ships alone (mechanical value independent); Jev pre-pass dormant; spike archived as evidence.

## Tasks

### TASK 1: Layer A — mechanical selector syntax check
- **Agent**: worker
- **Contract**: .workflows/specs/task-selector-lint.spec
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **What**: `scripts/check-spec-selectors.sh` — for every `.workflows/specs/*.spec` (+ spec paths given as args): extract `Test:` lines; `bash -n` each shell selector (parse-only, never execute); sanity-check grep-family flags (`-A/-B/-C/-c` numeric, pattern non-empty, referenced path non-empty). Exit 1 with file:line findings, 0 clean. Bun test against a fixture spec (valid + invalid selectors). Wire into `skills/plan/SKILL.md` Phase 5 (run after agent-spec parse; findings fix-or-justify before approval gate).
context: skills/plan/SKILL.md Phase 5; scripts/ conventions; tests/fixtures/
- **Verify**: bash scripts/check-spec-selectors.sh tests/fixtures/bad-selectors.spec (rc 1) && bash scripts/check-spec-selectors.sh tests/fixtures/good-selectors.spec (rc 0) && bun test tests/
- **Status**: ✅ DONE (2026-09-20, verdict ok:true — reviews/task-1.md; merged --no-ff 6b13827; suite 59/0)

### TASK 2: Trust extension — spec-sanity replay (prototype)
- **Agent**: worker (prototype; serial)
- **Contract**: .workflows/specs/task-spec-sanity-prototype.spec
- **Bottleneck**: 🟡 RISKY
- **Testing strategy**: evidence criteria
- **What**: Bounded question: "do the 3 spec-sanity Noul shapes separate T5-class bad selectors from good specs?" Corpus: negatives = T5's two pre-amendment selectors + any recoverable plan-040 negatives, each as a minimal spec-fragment state; positives = the 7 shipped specs of plan-010 + archived 001/003 specs. Build `requests/` (one batched payload per spec-fragment, 3 questions each: boundaries_specific / selectors_runnable / verify_literal — shapes verbatim from the proposal) + `expected.json` + `merge.py` (self-tested) under `.workflows/spikes/spec-sanity/`. END with "PHASE-A READY" + requests path; orchestrator executes the typesafe_evaluate batches and runs merge.
context: archive/done/20260919-010-code-contracts/reviews/task-5.md (negatives verbatim); archive specs; spike/jev-trust structure as template
- **Verify**: test -f .workflows/spikes/spec-sanity/report-skeleton.md
- **Status**: ✅ DONE (2026-09-20, verdict ok:true — reviews/task-2.md; spike verdict **NO-GO for Layer B**: selectors_runnable 21.1%, both T5 negatives false-passed; boundaries 89.5%/0-FP; root cause repo-dependent defects; redesign candidates on file)
context: archive 010 reviews/task-5.md (negatives); archive specs; jev-trust spike structure

### TASK 3: Layer B — Jev pre-pass wiring (conditional: TASK 2 GO)
- **Agent**: worker
- **Contract**: .workflows/specs/task-jev-prepass-wiring.spec — **DEFERRED until T2 verdict** (thresholds from its report)
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: grep + drift
- **What**: `skills/plan/SKILL.md` Phase 5 + `prompts/idea.md` contract phase gain the pre-pass rule: after Layer A, when typesafe is reachable (enabled + keyed — check, never assume), the ORCHESTRATOR runs one batched call (3 Noul per spec, state = spec text verbatim, shapes from the proposal); flags join the Phase 4/5 human approval presentation as "Decisions needed" lines with probabilities; thresholds from the T2 report marked with its evidence date; skip silently when unreachable; specs frozen post-approval.
context: skills/plan/SKILL.md; prompts/idea.md; execution-doctrine Jev pre-pass wording
- **Verify**: grep -q 'spec-sanity' skills/plan/SKILL.md && grep -q 'spec-sanity' prompts/idea.md
- **Status**: ❌ DROPPED (2026-09-20, T2 NO-GO — Layer B not wired; NO-GO path per plan: Layer A ships alone; redesign candidates in spikes/spec-sanity/report.md)

### TASK 4: Docs — README + CHANGELOG
- **Agent**: orchestrator inline (+ cheap dispatch if needed)
- **Depends on**: TASK 1–3
- **What**: README plan/Phase-5 mention (one line, both layers, degradation); CHANGELOG entry at SHIP (orchestrator-written).
context: README How-It-Works/Planning sections
- **Verify**: grep -q 'spec-sanity\|selector' README.md
- **Status**: ✅ DONE (2026-09-20, orchestrator-inline Tier A — commit dad0c9a; README Phase-5 paragraph incl. honest NO-GO note; CHANGELOG v0.6.1; no-args selector lint verified CLEAN on live specs)
context: README Planning section; DOCS-POLICY SHIP steps

## Contracts (generated after approval)

| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 1 | .workflows/specs/task-selector-lint.spec | 5 |
| TASK 2 | .workflows/specs/task-spec-sanity-prototype.spec | 4 (evidence) |
| TASK 3 | deferred until T2 verdict | — |

## Execution notes
- T2 dispatch needs typesafe enabled (✓ this session) — flags in-pack, calls orchestrator-side.
- T1 fixture specs live in tests/fixtures/ (tracked); spike artifacts gitignored under .workflows/.
