---
name: optimize
description: Improve performance or code efficiency against a measured baseline, with equivalence proofs. Use when the user says "optimize", "make it faster", "performance", "reduce allocations", "speed up", or asks for code optimization. Measurement-gated — refuses to optimize what isn't benchmarked.
user-invocable: true
argument-hint: "<area or hot path to optimize>"
---

# Optimize Workflow

Change code to be measurably faster or leaner WITHOUT changing behavior. Every optimization lands with two proofs: an **equivalence proof** (behavior unchanged) and a **measurement** (the delta, on a committed benchmark). This is `/refactor`'s sibling: refactor improves shape, optimize improves cost — both preserve behavior, neither tolerates "probably the same".

## Doctrine (why this exists)

- **Mechanical best-practices → project verify gates** (linters, checkers). Not this workflow.
- **Judgment quality (design, security, simplicity) → `/review`.** Not this workflow.
- **Measured improvement → `/optimize`.** This workflow.
- A performance claim without a number is a non-finding (same bar as the quality-reviewer doctrine). `/optimize` exists so optimization work is *evidence-gated*, not vibes-gated.

## Phase 0: GATE — baseline or nothing

🛑 **HARD GATE**: If no benchmark exists for the target area, the first and only plan task is
**"build the benchmark + equivalence oracle"** — not optimization. Do not hand-wave a baseline
("it feels slow", "this loop looks O(n²)") into an optimization task.

1. Check for an existing benchmark: `tests/bench/`, `bench/`, existing timing tests, CI perf runs.
2. If one exists: capture the baseline NOW, on this machine, N repetitions, record environment
   (CPU, runtime version, load context). Baselines from other machines or old runs are not baselines.
3. If none exists: stop and plan the benchmark task first (Phase 1 applies to IT, optimization
   follows in a later wave).

**Benchmark requirements** (what a valid baseline needs):
- Committed to the repo (reproducible by anyone, comparable across runs)
- Deterministic workload or fixed seed; warm-up pass discarded
- N repetitions, report **median** (and note spread); single runs prove nothing
- An **equivalence oracle** baked in: for a compiler it's the golden corpus; for a renderer,
  DOM-equivalence against the previous output; for a cache, operation-result equality. The oracle
  is what makes "no behavior change" checkable per-optimization instead of by hope.

## Phase 1: PROFILE — find the actual cost

1. Run the benchmark; profile the hot path (runtime profiler, `--prof`, tracing, flamegraph —
   whatever the stack offers). **The profile names the target. Not intuition.**
2. Classify candidates by measured share: a 40%-of-time function is a target; a 0.5% function is
   noise no matter how ugly it looks.
3. Record the numbers in `.workflows/CONTEXT.md` (or the plan) — they are the "why" for every
   later task and the defense against re-optimizing the wrong thing later.

## Phase 2: PLAN — tasks with double contracts

Write `.workflows/plan.md` (same discipline as `/plan`). Each optimization task's contract MUST
carry both:

1. **Equivalence clause** — name the oracle that must stay green (exact suite + corpus/parity
   checks). For Morph-style code: golden corpus byte-identical, static≡runtime parity intact.
   Any output-affecting "optimization" is not an optimization — it's a behavior change; route it
   to `/plan` instead.
2. **Measured-delta clause** — the benchmark, the metric (median ms / allocs / peak RSS), and a
   target floor (e.g. "≥10% median reduction on bench X"). An optimization that lands under the
   floor is REJECTED — the added complexity didn't buy the projected win. Targets come from the
   Phase 1 profile share (you cannot win more than the function's total share of runtime).

Bottleneck tags: optimization tasks are **🟠 VERIFICATION_HEAVY** by default (extra verify budget:
full suite + benchmark re-run + diff review of the hot path). Wave shape: one optimization per
wave when they touch shared files; parallel waves only with disjoint boundaries (same rule as
`/plan`).

Hard rules for tasks:
- No behavior change, no API change, no output change — the oracle proves it, or the task fails.
- No micro-optimizations invisible on the benchmark (they fail the delta clause).
- No speculative generality ("this might help other callers later") — findings bar applies.
- Complexity budget: if the optimization makes the code materially harder to read, it needs a
  bigger measured win to justify itself. State the tradeoff in the task.

## Phase 3: EXECUTE — measure per task

Per task (worker + reviewer loop, same as `/plan`):

1. Worker implements, runs the full verify suite AND the benchmark before/after on the same
   machine state. Report: median delta, spread, oracle status.
2. Reviewer verifies mechanically: suite green, oracle green, benchmark numbers reproduce
   (re-run independently), the diff is confined to the contracted boundary.
3. Update plan.md Execution Notes with the measured result per task — including honest FAILURES
   ("tried X, −2% ± noise, rejected, reverted"). Negative results are knowledge.

## Phase 4: VERIFY — regression check on the whole

After the final wave:

1. Full suite + all gates green.
2. Benchmark re-run on the integrated tree: total improvement stated against the Phase 0 baseline
   (e.g. "compile bench: 412ms → 298ms median, −28%"). Per-task wins that evaporate when
   integrated (cache interactions, deopt) get reported, not hidden.
3. **No-regression sweep**: no benchmark scenario slower than baseline beyond the noise floor
   (state the floor). Optimizing one path while pessimizing another is a fail.
4. Docs: record the result in `.workflows/CONTEXT.md` (numbers + what was learned about the hot
   path). Then `/review` → SHIP, as usual.

## Rules

- **Never optimize without a baseline.** Phase 0 gate has no override.
- **Equivalence is proven, not asserted.** The oracle runs in every task's verify.
- **Numbers or it didn't happen.** Median + spread, same machine, committed benchmark.
- **Below-floor wins are rejections.** Complexity must be paid for in measured milliseconds.
- **Report negative results.** A reverted optimization with numbers is a useful plan task; a
  silent drop is a lesson lost.
- **The benchmark outlives the plan.** It joins the repo's verify story so future changes keep
  the numbers honest (advisory in CI if flaky, required if stable).
- Workers never commit; SHIP is the human's call — identical to `/plan`.
