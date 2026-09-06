# Improvement — subagent economics: context packs, verify lines, fix-round salvage, stall doctrine

- **Status**: IMPLEMENTED (proposals 1–4 + 7 patched into `agents/` same day;
  5–6 are doctrine for the planner/dispatcher, encoded in
  `agents/execution-doctrine.md`; ROUTE tagging additionally wants a
  `prompts/plan.md` pass — parked there).
- **Created**: 2026-09-08, session following plan 20260908-034 dogfood
  (Morph/MorphEditor live-channel: one 141.8-min stall, one take-over salvage).
- **Method**: grounded review — machinery read in full (`agents/worker.md`,
  `agents/reviewer.md`, `agents/quality-reviewer.md`, `agents/registry.md`,
  `agents/dispatch-shapes.md`, `agents/execution-doctrine.md`), and every
  timing claim below computed from the child session JSONLs under
  `~/.pi/agent/sessions/` (first-event → last-event delta per session file;
  includes idle waits between turns — that IS the wall-clock the orchestrator
  and the human experience).

---

## The evidence (session ledger, hard numbers)

### Plan 20260908-034 (live channel) — 234 min of child time, 5 tasks

| child | min | turns | outcome |
|---|---|---|---|
| t1w → t1r2 | 2.7 + 1.7 | 15 | ✅ first pass |
| **t2w** | **141.8** | **15** | 🗑 aborted — ~9.5 min/turn = stall |
| t2w2 → t2r2 | 15.2 + 3.0 | 34 | ✅ first pass |
| t3w/t3r + t3bw/t3br | 10.8 + 2.5 + 19.5 + 4.5 | 63 | ✅ clean |
| **t4w** | **31.6** | 64 | 🗑 aborted at ~90% done; salvaged + finished orchestrator-inline |

74% of plan-034 child wall-clock (173 of 234 min) produced nothing directly —
the two aborted runs. Meanwhile the bounded, spec-shaped tasks were the
cheapest in the ledger (t1w 2.7 min), consistent with the 2026-08-22 doc's
thesis: open-endedness, not difficulty, causes the cost blowups.

### The 2026-09-01 plan (7 tasks) — loop multiplication at full stretch

≈365 min (6.1 h) of child time, ~52 min/task average. Worst chains:

- **task-5**: 3.3 (worker) + 6.3 (review) + **43.2 (fix-r2, 141 turns)** +
  9.2 (re-review) + 6.2 (quality) + 11.5 (fix-r3 + r3b) + 13.0 (fix-pins ×2)
  + 3.2 (quality-final) = **96.7 min across 10 dispatches; 5 fix rounds ≈ 68 min (70%)**.
- **task-4**: worker + review + quality + fix + re-review + quality-re-review
  + fix + quality-final = **8 dispatches, 76.9 min**.

### Stalls across all recorded history

Six 60-min ceiling kills + t2w's 141.8 min ≈ **10.4 h of pure stall**. Two
classes visible in the turn counts: *hangs* (60 min / ~40 turns — wedged
probes, dead waits) and *thrash* (60 min / ~190 turns — high activity, no
convergence). Both burn the same wall-clock and both go undetected until the
ceiling fires.

### The honest inline comparison

The orchestrator working a task inline is faster for open-ended work not
because of model quality but because: its context is already warm (it wrote
the plan and read the code), it verifies once instead of re-running the
pipeline per child, and there are zero dispatch round-trips or fix-round
re-dispatches. The loop buys isolation, parallelism, and *independent*
verification (self-verification is biased). The proposals below attack the
cost side without giving up the independence.

---

## Root causes, mapped to files

1. **Context passed to children is pointers, not content.**
   `agents/dispatch-shapes.md` worker task text = "read the spec; the workflow
   is in your role prompt." Every child cold-starts: AGENTS.md → features
   docs → spec → plan → greps. The fix already exists in-package — the
   spec-drafter shape pastes **scout-fact slices inline** — but only
   spec-drafters get it. (MorphEditor later re-invented this as the
   "STANDING SUBAGENT TEMPLATE" per-repo folklore in its LOG.md — the package
   never absorbed the pattern.)
2. **The reviewer re-derives the environment.** `agents/reviewer.md` Layer 3
   says `npm test … # Adapt to project stack`. A fresh child figures out
   Deno-vs-npm, task names, then runs the suite — per review, per re-review.
   This is also a correctness trap: a reviewer adapting to `npm test` in a
   Deno repo can emit a false FAIL/VOID.
3. **Fix rounds are full cold-start workers.** The fix-round shape
   (`agents/execution-doctrine.md`) passes rejection evidence but NOT the
   prior worker's accumulated map — the salvage prepend exists only in the
   ESCALATION shape. Hence fix-r2 at 43.2 min with 141 turns.
4. **Stall detection is parked.** The 2026-08-22 doc already parked the
   watchdog V2; meanwhile the 1 h default ceiling is generous (legit tasks
   finish <35 min) and `/subagents auto-limit off` raising it to 6 h is how
   t2w sat 141.8 min.
5. **The open-ended/bounded routing rule exists but is not operational.**
   `agents/execution-doctrine.md` says open-ended integration tasks go
   orchestrator-inline or to the strong slot — yet plan-034 T4 (open-ended UI
   integration) was dispatched to a worker anyway, misfired, and the
   orchestrator finished the salvaged 90% inline in a fraction of the time.
6. **Quality-reviewer multiplication.** The 🟡/🟠/🔴 tag gate barely filters
   (nearly every code task carries one) — task-4 ran 8 dispatches including
   three quality passes.

---

## Proposals

### P1 — Task context pack (biggest lever) — IMPLEMENTED

Extend the spec-drafter's "scout facts inline" pattern to worker, fix, and
reviewer dispatches. The orchestrator compiles, per task, a short CONTEXT
PACK pasted into the task text:

- the exact verify commands that work in THIS repo (not "npm test");
- the 3–6 relevant file paths with one-line "what's there";
- the integration seam (named symbols where new code plugs in);
- env quirks (probe discipline, timeouts, package-manager law);
- decisions and known dead ends.

Landed: `agents/dispatch-shapes.md` (slot in both worker shapes + reviewer),
`agents/worker.md` §Read context (consume it before discovery).

### P2 — Verify-line contract — IMPLEMENTED

Spec frontmatter gains `verify: <literal command line>` — what the worker
ran. The reviewer executes it verbatim (Layer 3), adapting only when absent,
and must note the adaptation. Kills environment re-derivation per review and
the npm-in-Deno false-fail trap. Landed: `agents/reviewer.md` Layer 3,
`agents/dispatch-shapes.md` reviewer task text.

### P3 — Fix-round salvage — IMPLEMENTED

Fix dispatches prepend (a) the task's context pack and (b) the previous
worker's final report verbatim (Files Changed + notes + deviations), the same
salvage pattern the ESCALATION shape already uses. The fixer starts from the
prior map, not from zero. Landed: `agents/execution-doctrine.md` fix-round
shape.

### P4 — Stall doctrine + tighter ceilings — IMPLEMENTED

- Explicit `maxRuntimeMs` on every code-task dispatch (ceiling ≈ 2× the
  expected duration; 35–45 min covers the observed legit range — the 1 h
  default stays as the safety net, `auto-limit off` is documented as
  reckless for children).
- Slice-await turn-gap check: while parked, if a child produced no new turn
  in ~10 min → ONE steer; a second silent slice → abort + salvage (the T4
  salvage proved 90%-done work is recoverable and valuable).

Landed: `agents/execution-doctrine.md` §Stall handling (new section).

### P5 — ROUTE tag at plan time — DOCTRINE LANDED, prompt pass parked

The planner writes `ROUTE:inline | ROUTE:worker` per task using the
open-endedness checklist (unnamed integration seams, UI judgment,
cross-module wiring → inline). Routing stops being a mid-flight judgment
call. Landed as dispatch-side doctrine in `agents/execution-doctrine.md`;
wiring it into `prompts/plan.md`'s plan format is a separate small pass.

### P6 — Tighten the quality-reviewer gate — IMPLEMENTED

Quality review per task only when: diff > ~300 lines, OR
security/concurrency/crypto/parsing class, OR the mechanical reviewer flags
judgment concerns. Otherwise the whole-plan `/review` covers it. Landed:
`agents/execution-doctrine.md` (loop section) — the existing per-task
tag-gating text now carries the diff/risk disjunction.

### P7 — Delta re-reviews — IMPLEMENTED

Re-review after a fix round reviews the delta: `git diff <roundN-1>..<roundN>`
plus the verdict file chain, not the whole surface re-derived cold. Landed:
`agents/execution-doctrine.md` re-review note + `agents/dispatch-shapes.md`.

---

## Expected effect, from the ledger arithmetic

For a plan-034-shaped 5-task plan: P4 alone recovers the 141.8-min stall
class (~60% of child time in the worst case); P1+P2+P3 cut the ~8–12 min
cold-start from each of the ~3–6 non-first dispatches per task; P6 removes
1–3 dispatches per 🟡 task; P7 turns 10–17-min re-reviews into 3–5-min ones.
Conservative net for the 2026-09-01 marathon: ≈365 min → ≈150–200 min with
the same verdict independence. For plan-034 specifically: ≈234 → ≈90 min
(bounded tasks were already cheap; the two aborts are what P4+P5 target).

## Validation hooks for the next dogfood

Record per task in LOG.md: dispatch count, child wall-clock, fix-round count,
stall aborts. Compare against the 2026-09-01 / 2026-09-06 baselines above.
If fix rounds still exceed ~2 per task or cold-start (first-turn latency to
first file read) still exceeds ~5 min, the context pack is not being compiled
— that's an orchestrator discipline failure, not a machinery failure.
