# Improvement brainstorm — test-first planning & stuck-agent escalation

- **Status**: PARTIALLY IMPLEMENTED (2026-08-22, same session): idea-1 V1
  shipped as the **prototype task type** (own spec + standard review loop,
  no VERDICT.md — the plan draft re-confirms at the human gate; skills/plan/
  SKILL.md + templates/CONTRACT-FORMAT.md); idea-2 V1+V3 shipped as the
  **worker stuck protocol + escalation matrix** (agents/worker.md,
  dispatch-shapes allowIntercom, execution-doctrine.md §Stuck handling).
  Remaining: V2 watchdog (needs the wake-mechanism spike), idea-1 V2/V3
  (parked unless justified).
- **Created**: 2026-08-22, session following plan-008 dogfood (5 class-5 misfires) + v0.5.7 ship
- **Method**: grounded brainstorm — every claim below checked against the current
  repo state (`skills/plan/SKILL.md`, `templates/CONTRACT-FORMAT.md`, `agents/worker.md`,
  `agents/execution-doctrine.md`, pi-core-subagent 1.3.32 source) before rating.

---

## Idea 1 — plan the tests before the workers (test-first planning, prototype-first for risky tasks)

### What exists today

| Piece | State |
|---|---|
| BDD scenarios with explicit `Test:` function names in every spec | ✅ written at PLAN time (spec-drafter, drafting phase 4) — test *naming* is planned first; the worker writes the bodies |
| `agent-spec lifecycle` mechanical verification | ✅ worker runs it, reviewer runs it |
| `tdd-guard lint/verify` (test quality, spec↔test mapping) | ✅ worker + add-feature/fix skills, post-hoc |
| Tier C spike/architecture (verdict artifact, strong model, zero prod files unless GO) | ✅ exists, but only as a task *type* |
| "Consider prototype first" for 🟡 RISKY | ⚠️ one line in the tier table — no artifact, no linkage, easy to skip |
| `/explore` spikes (`.workflows/spikes/<slug>/` + VERDICT.md) | ✅ exists, but pre-plan only — nothing feeds a spike verdict INTO a plan task's spec |

**The gap**: requirements are validated by the *worker discovering them mid-implementation*
(plan-008 T4: three misfires whose research output was, effectively, the requirements
discovery we should have done at plan time), and a spec's `Test:` names are written by a
spec-drafter that has never executed anything.

### Variants

**V1 — Prototype-validation phase inside plans** (risk-gated)
For 🟡 RISKY / large Tier B tasks, the plan explicitly decomposes into:
`T-pre (Tier C prototype, bounded: prove the approach + surface the real API/requirements
→ VERDICT.md GO/NO-GO + facts) → T-impl (Tier B, spec written FROM the verdict, i.e. bounded
by evidence instead of open-ended)`.
- **Impact: HIGH.** Directly attacks the class-5 misfire pattern — the doctrine already
  routes open-ended tasks to inline/strong, but this *converts* open-ended into bounded,
  which is strictly better than routing around it. The plan-008 T4 research artifacts were
  exactly this prototype output, produced expensively by accident.
- **Effort: LOW.** All machinery exists (Tier C, spikes/VERDICT.md format, spec-drafter
  consumes scout facts). It's doctrine + plan-SKILL wiring: make "prototype for 🟡/large"
  the default rather than a suggestion, and make the impl task's spec cite the verdict
  the way Context claims cite scout facts.
- **Risk**: prototype tasks can themselves misfire (same failure class) — mitigate by
  bounding them hard (single question, verdict artifact required, Tier C rules).

**V2 — Test skeletons committed at plan time** (spec-time TDD)
Spec-drafter (or a new plan phase) writes failing test skeletons to the repo before the
worker dispatches; the worker's job becomes "make these green + fill assertion bodies".
- **Impact: MEDIUM.** Locks the requirement interpretation at plan time; worker drift
  becomes mechanically detectable. But test skeletons are frequently wrong for UI/visual/
  integration work (the domains that misfire most), and creates double authority: spec
  text vs test code disagree → who wins? (Answer would have to be doctrine; specs win,
  skeletons are corrected in a fix round.)
- **Effort: MEDIUM.** New artifact type, reviewer layer ("does the skeleton match the
  scenarios?"), fix-round rules, and every existing skill touching specs needs updating.
- **Verdict**: only worth it for 🔵 algorithmic/core tasks. Skip as a general rule.

**V3 — TDD ordering inside the worker role** (red→green discipline)
Worker must write tests for its own scenarios first, show red, then implement, then green;
tdd-guard extended with a red-phase check.
- **Impact: LOW-MEDIUM.** tdd-guard verify already checks spec↔test mapping post-hoc;
  ordering discipline adds little for bounded tasks and nothing for misfire prevention.
- **Effort: LOW-MEDIUM** (worker.md phase + tdd-guard flag).

### Recommendation
**V1 now** (doctrine + plan-SKILL edit, ~half a session), V2 only as an opt-in tier for
algorithmic tasks, V3 skip.

---

## Idea 2 — stuck-detection, intercom help, and model/reasoning escalation

### What exists today

| Piece | State |
|---|---|
| `ask_parent` intercom (child → leader question, `reply_subagent` resumes the run) | ✅ mechanically complete in pi-core-subagent 1.3.32 (`pendingReplies` — we verified the fix) |
| `allowIntercom` dispatch option | ✅ exists in the subagent tool |
| Worker role knowing ANY of this | ❌ `agents/worker.md` (272 lines): zero mentions of ask_parent, stuck, help, escalation |
| Dispatch shapes enabling intercom | ❌ not present |
| Child self-upgrading model/thinking | ❌ impossible by design — model is fixed at dispatch |
| Re-dispatch with stronger model + salvage | ✅ happens today as orchestrator judgment (fix rounds already re-dispatch at thinking:high) |
| Orchestrator-side live telemetry | ✅ NEW: `watch-children.sh` (turns, cost, last event, live) + `dispatch-ledger.mjs` (durable outcomes) |

**The gap is not mechanical — it's that (a) workers don't know the protocol exists,
and (b) the agent that most needs help is the least able to ask.** Plan-008's class-5
misfires did not report stuck; they confidently produced research documents. Self-report
cannot be the only channel.

### Variants

**V1 — Worker "stuck protocol"** (self-report, cheap)
Add to `agents/worker.md`: named stall signals — same failure twice in a row, suite red
3× for the same reason, contract ambiguity (two readings of a criterion), missing
dependency outside Allowed files, ~15 turns without a green verify. On a signal:
`ask_parent` with a structured HELP message: `{blocked-on, what I tried, evidence,
options I see, my recommendation}`. Orchestrator doctrine: reply with a decision
(unblock / narrow scope / re-dispatch stronger / abort); every HELP exchange is logged
(LOG.md + dispatch ledger outcome `blocked`).
- **Impact: MEDIUM-HIGH.** Converts silent thrash (the fix-round loop we saw: red suite
  → patch → red suite) into a cheap question. Best case each blocked worker saves 10+ min.
- **Effort: LOW.** worker.md section + dispatch shapes add `allowIntercom: true` +
  reply rules in execution-doctrine.md. All mechanisms exist in 1.3.32.
- **Risk**: over-triggering (weak models asking instead of trying) → cap at 1 HELP per
  task; a second stall escalates automatically.

**V2 — Orchestrator watchdog** (mechanical stall detection, the real fix)
The orchestrator — not the child — decides "stuck". Signals already computable from
what we built: turns exceeding a per-tier budget without file-write events (ledger +
watch-children data), repeated identical tool calls, worktree branch with no commit
near the task's expected end. Response ladder: steer message ("state your current
hypothesis + next concrete step") → if still stalled at next check, cancel + re-dispatch
stronger with salvage.
- **Impact: HIGH.** This is the only variant that catches the class-5 agent (which
  believes it is succeeding). Also the only one that catches silent-death (T6-style
  session death masquerading as a running task).
- **Effort: MEDIUM.** Needs a periodic check loop during awaits (the orchestrator is
  parked in `await_subagent` — the wake mechanism can carry a watchdog tick), a
  turns-budget per tier in the doctrine table, and a steer→cancel→re-dispatch ladder
  written down. Nothing new mechanically; it's orchestration logic + doctrine.
- **Open question**: does the orchestrator get woken on a timer, or only on child events?
  (pi-core-subagent parks the leader on await; a watchdog needs either a turn-based check
  when multiple children run, or an extension-level timer — worth a spike in the
  pi-extensions repo.)

**V3 — Escalation flow (model/thinking upgrade)**
On V1 HELP or V2 watchdog trigger, the orchestrator re-dispatches the SAME contract at a
higher slot (`@model:strong`, thinking xhigh) with the stuck child's findings prepended
(the salvage pattern — identical to what fix rounds do today, one level up). Doctrine
table: escalation matrix stall-type → response (clarify steer / narrow spec / escalate
model / human gate). Dispatch ledger records `escalated:<from>→<to>` as an outcome so the
registry learns which tiers actually need escalation.
- **Impact: MEDIUM.** The salvage-re-dispatch pattern is proven (fix rounds, T4 inline
  takeover). Formalizing it mainly removes judgment latency and makes escalation
  evidence-bearing via the ledger.
- **Effort: LOW.** Doctrine + escalation matrix only. (True mid-run model switching is
  impossible in pi-core-subagent by design — re-dispatch IS the mechanism, and that's fine.)

### Recommendation
**V1 + V3 together now** (one session: worker.md protocol, dispatch shapes
`allowIntercom: true`, escalation matrix + reply rules in execution-doctrine.md, ledger
outcome vocabulary `blocked`/`escalated`). **V2 next** — highest impact but needs the
watchdog-wake spike first.

---

## Suggested sequencing (if any of this gets built)

1. **Prototype-validation phase (V1 idea-1)** — lowest effort, attacks the misfire class
   we have the most evidence for, needs no extension changes.
2. **Stuck protocol + escalation matrix (V1+V3 idea-2)** — pure prompt/doctrine work on
   top of verified 1.3.32 mechanics.
3. **Watchdog (V2 idea-2)** — spike the wake mechanism in pi-extensions first.
4. **Test skeletons (V2 idea-1)** — only if algorithmic-task volume justifies it.

Cross-cutting: every piece feeds the dispatch ledger (new outcomes: `blocked`,
`escalated`) so the model registry keeps accumulating evidence with each plan.
