# Spec-sanity pre-pass — Jev at plan Phase 5, before any worker dispatches

- **Created**: 2026-09-20
- **Status**: APPROVED 2026-09-20 — all four decisions WITH recommendations: (1) adopt both
  layers; (2) specs only; (3) Layer A as its own mechanical Phase 5 step;
  (4) trust corpus as described. Implementation: plan 20260920-011.
- **Kind**: working material (stays in `.workflows/`, never ships)
- **Extends**: `archive/done/20260919-010-code-contracts/20260919-code-contracts-durable-rules.md`
  (approved, shipped v0.6.0). Revives, narrowed and evidence-based, the
  plan-lint idea from the SUPERSEDED jev-judgment-gates proposal — only the
  spec-sanity slice; the rest of that proposal stays dead.
- **User origin**: direct question — "do we use typesafe to make certain the
  plan, tasks and context are correct BEFORE the worker works?" Answer today
  is no; this proposal is the smallest right shape for yes.

## The problem, with this-session evidence

Mechanical spec parse-lint (Phase 5, agent-spec parse — added after
plan-040's eight-unparseable-specs tax) catches **syntax**. It is blind to
selectors that parse fine but are wrong as written. Evidence, same day:

- **T5 round 1 (ok:false)**: two spec selectors were artifacts — a grep
  window (`-A6`) narrower than the content it gated, and a negative count
  (`### Allowed Changes = 1`) unattainable since before the branch. The spec
  PARSED; the reviewer found it only AFTER a worker round; fix round + spec
  amendment + re-review followed. Cost: one worker round + two review rounds
  + human attention — for a defect that was visible in the spec text itself.
- Doctrine lesson already logged: "author specs with greps RUN against a
  real draft first". That rule lives in prose — nothing enforces it at the
  moment specs are generated.

The class: **spec defects detectable from the spec text alone, before any
work exists** — vagueness (Boundaries as descriptions, not paths), selectors
that cannot run as written, Verify lines that aren't literal commands,
windows that cannot attain their match.

## The design

Two layers at plan Phase 5, after mechanical parse-lint, before the human
approval gate re-presentation:

### Layer A — mechanical selector syntax check (free, no Jev, no key)

Every `Test:` selector that is a shell command gets `bash -n` (parse-only);
every grep-family selector gets its flags sanity-checked (`-A/-B/-c` take
numeric args; patterns non-empty; paths in the selector exist in the repo or
are created by the task's Allowed Changes). Catches typo-class defects
mechanically. Exit-code bound, like every Layer check. This alone would NOT
have caught T5 (both T5 selectors were syntactically valid) — hence Layer B.

### Layer B — Jev spec-sanity pre-pass (one batched call per plan)

Per generated `.spec`, three Noul questions (state = the spec text verbatim
+ the repo paths it names):

1. `boundaries_specific` — "Is every path in Allowed Changes an exact path
   or glob, rather than a description?"
2. `selectors_runnable` — "Would every `Test:` selector, run as literally
   written after the task completes, execute without shell errors and be
   capable of matching?"
3. `verify_literal` — "Is the Verify line a literal command line, not a
   description of what to do?"

Flags (thresholds from the trust extension below, NOT carried from the
prior spike — different question shape) join the Phase 5→human approval
presentation as "Decisions needed" lines: e.g. "spec task-X: selectors
possibly unattainable (p=0.88) — confirm". Advisory only; a human approving
the plan is the gate, never Jev.

Post-approval specs are FROZEN — the pre-pass runs once at generation, not
per dispatch.

## Trust gate before any wiring (same discipline as 7p)

Extended replay on ground truth that already exists:

- **False cases**: T5's two original selectors (pre-amendment), from
  `archive/done/20260919-010-code-contracts/specs/task-cc-spec-section.spec`
  git history; plus any plan-040 unparseable specs recoverable from archive.
- **True cases**: this session's seven other shipped specs + the archived
  specs of plans 001/003 (they gated real passing work).
- Accuracy bar for GO: zero false-passes on the false corpus (a missed bad
  selector is the whole point), report accuracy on the true corpus; propose
  thresholds from THIS replay (the v0.6.0 thresholds were for
  compliance/supersede shapes — different judgments, no carry-over).

## What we deliberately do NOT do

- **No Jev per worker dispatch** — workers stay Jev-free (verdict-gating
  doctrine: judgment enters after mechanical review, never in the build
  loop; confirmed by code review 2026-09-20).
- **No auto-block**: pre-pass flags ride the human approval gate; the human
  decides. Jev never prevents a dispatch by itself.
- **No plan-tag/tier cross-check in v1** — the first-turn idea stays a
  future candidate; this proposal keeps one narrow shape.
- **No context-pack validation** — pack correctness is the `context:`
  marker + hygiene watchdog's mechanical job; semantic pack review is a
  different, larger shape with no failure evidence behind it yet.
- **No re-running on frozen specs** — once at Phase 5, never per-dispatch.

## If approved

No ADR needed (advisory tooling inside the existing Phase 5, reversible,
not surprising — the sparse-ADR rule says skip). Implementation shape:
plan SKILL.md Phase 5 + a trust-extension spike
(`.workflows/spikes/spec-sanity/`) before wiring, mirroring 7p's
prototype→gate flow.

## What needs your decision

1. **Adopt the two-layer pre-pass?** Recommended: yes — Layer A is free and
   mechanical; Layer B is the first Jev use that acts BEFORE work is spent,
   aimed at the one defect class this session actually paid for.
2. **Scope**: specs only (recommended) vs. also plan task blocks?
3. **Layer A as a separate mechanical Phase 5 step** (recommended: yes —
   free, exit-code bound, catches the typo class Layer B shouldn't spend
   questions on).
4. **Trust-extension corpus**: this session's specs + T5 git-history
   negatives + plan-040 archive if locatable (recommended: exactly that).
