# Execution doctrine — verdict gating, fix rounds, verdict artifacts

Loaded on demand by `/next`, `/auto-next`, `/review` when a verdict rejects
or when the full loop shape is needed. Normative — follow exactly.

## The loop (no model marks its own work done)

A worker settling is NOT completion. The task's `✅` in plan.md is written
**only after a reviewer verdict `ok:true`** — mechanical stage first, then
judgment:

```
worker → reviewer in ONE graph call (`needs` edge) → verdict
   reviewer fires mechanically when the worker settles — no orchestrator turn between
   ok:true → orchestrator runs tooling/verify-landing.sh --branches subagents/* <repo> <allowed>... < claims.txt (tripwire)
       tripwire OK → persist verdict → ✅ DONE
       tripwire ALARM → phantom work → worker report untrusted → redispatch with explicit per-task cwd
   ok:false → fix round N (follow-up dispatch) → re-review → verdict …
              (N capped at max-rounds, default 2)
   worker failed/blocked → reviewer auto-aborts — the abort is the failure signal
   rounds exhausted → ❌ FAILED + verdict chain to the human
```

Rules:
- **Fix rounds are follow-up dispatches, never pre-declared graph nodes** —
  they exist only when a verdict rejects.
- **Failed worker auto-aborts the reviewer node** — broken work must not
  be reviewed; the orchestrator reads the abort as the failure signal
  (no verdict exists — inspect the worker's output directly).
- **Reviewers verify, never fix.** The reject → fix → re-review triangle
  keeps evidence independent.
- **`max-rounds`** comes from the spec frontmatter (`max-rounds: N`,
  default 2). Exhausted rounds = ❌ FAILED, never an infinite loop.
- The same loop applies to the judgment stage: a quality-reviewer
  standalone follow-up runs the same
  worker→(reviewer)→verdict discipline on judgment dimensions. **Jev
  pre-pass (orchestrator-side, automatic when enabled)**: before
  dispatching a quality-reviewer for a task whose diff touches `@cc`
  contracts or ADR-governed seams, the ORCHESTRATOR — the only session
  holding `typesafe_evaluate` — runs the one batched call (shapes and
  thresholds in `agents/quality-reviewer.md` Check #5; verify reachability
  first: an enabled-looking extension with no key silently skips) and
  prepends the resulting flags into the dispatch pack. The child reports
  the flags; it never needs the tool. If typesafe is unavailable, skip the
  pre-pass entirely — the child's step self-skips (degradation, not
  failure). The same pre-pass upgrades the extension's supersede advisory
  line: when it fires and typesafe is reachable, run the choice question
  (supersedes/contradicts probability); ≥0.90 names the human gate
  (`SUPERSEDE_PROBABILITY_THRESHOLD` semantics in the extension), below
  stays static — routing only, never a verdict.
  `ok:false` (CHANGES_REQUESTED) triggers a fix round with the same cap —
  only after mechanical ok:true.
- **Quality-reviewer placement — per-task, gated, never per-wave.**
  Dispatch a quality-reviewer as a standalone follow-up AFTER the
  mechanical reviewer returns `ok:true` — it cannot be a `needs` node
  because it is conditional on the verdict. The gate is a DISJUNCTION
  (2026-09-08 economics doc: the tag alone filtered almost nothing —
  nearly every code task carries 🟡/🟠/🔴): run a per-task quality pass
  only when (a) the diff exceeds ~300 lines, OR (b) the task class is
  security/concurrency/crypto/parsing, OR (c) the mechanical reviewer or
  worker report flags judgment concerns. Everything else is covered by the
  whole-plan `/review` — that stays the quality gate where integration
  effects are judged. Never per-wave: wave tasks are independent parallel
  tasks with disjoint boundaries — quality-judging unrelated changes
  together is the wrong granularity.
- In parallel waves: parse each task's verdict from the reviewer's output;
  run fix rounds for every ok:false before advancing the wave.
- **Tripwire (verify-landing.sh) runs after every claimed-done write task**
  — the orchestrator runs `tooling/verify-landing.sh --branches subagents/* <repo> <allowed>...`
  with claimed files on stdin. The tripwire accepts branch evidence: S1
  passes on a dirty main tree OR an allowed-scoped non-empty task branch
  (`subagents/<run>/<task>`), never on branch existence alone — an
  empty-diff branch with a done claim is still an ALARM. ALARM = phantom work
  → the worker's report is untrusted → verify cwd → redispatch with explicit
  per-task cwd. Fake work is never reviewed. The script's `--selftest` mode
  is the authoritative verification for fixture-based contract scenarios
  that agent-spec lifecycle cannot cover.
- **Consolidated final review**: parallel waves no longer share a single
  tree — each write task lands on its own `subagents/<run>/<task>` branch,
  and that per-task branch diff (`git diff <base>..<branch>`) is the review
  surface wave reviewers verify, never a shared tree. The consolidated
  full-tree review at plan end — running guard once over all specs against
  the complete tree — remains the review of record; the final `/review`
  catches everything (including cross-task integration).
- **Lifecycle-skip honesty**: `agent-spec lifecycle` scenario skips are
  "unverified-by-lifecycle" — a documented gap
  (fixture-based or grep-based scenarios have no verifier bound).
  Orchestrators instruct reviewers explicitly how skips are covered
  (e.g., `--selftest` mode, tdd-guard selectors + suite green, manual
  grep checks). Never silently treat a lifecycle skip as a pass.

## Plan lifecycle & await economy

- **Status line**: every plan.md opens with
  `Status: DRAFT|DISPATCHED|EXECUTED|SHIPPED` — the single writer is the
  orchestrator; per-task emoji flips only after that task's reviewer settles
  (stale-echo rule: a settled task is never re-marked from a newer report).
- **Ship ritual branch merge**: before the ship commit, `git merge --no-ff`
  each write-task branch in the run's namespace (`subagents/*`) into the
  main branch — each per-task `--no-ff` merge commit documents the wave.
  Chained write tasks (`chain:[A,B]`, both `write:true`) stack on the
  upstream branch (B sees A's edits; merges are order-independent) and
  sibling write-branch overlaps raise `CONFLICT RISK` naming the files
  (≥1.3.51) — resequence overlapping writers instead of merging.
- **Ship ritual archive step**: at SHIP, consumed specs move to
  `.workflows/archive/done/<plan-id>/specs/` — reviewers and guard layers see
  only live specs.
- **Ship ritual end-state check** (mechanical, after the archive step): the
  `.workflows/` top level must contain ONLY durable items (`CONTEXT.md`,
  `LOG.md`, `archive/`, `knowledge/`, `research/`, `scout/`, `specs/`,
  `spikes/`, `patches/` as applicable) — a leftover `plan.md` (unsettled
  status), `plan-draft-*.md`, or populated `reviews/` at ship time is a
  hygiene violation: sweep each into its plan's `archive/done/` bundle
  before the ship commit. Never silently skip — a lifecycle skip is not a
  pass.
- **Await-loop economy** (engine-native): background-first spawns;
  `autoAwait: true` only when the result gates the very next step; long runs
  use the slice-loop (`await_subagent` in short `timeoutMs` slices — process
  settled tasks incrementally, never park on the whole run); targeted
  `subagent_result(taskId)` for full text (completion notices stay 3-line);
  wake budget ≈ one await per wave; never re-read settled reports.
- **Runtime ceiling** (engine-native, ≥1.3.43): every task has a hard
  wall-clock cap — 1 h default; `/subagents auto-limit off` RAISES it to
  6 h (it no longer removes the cap). Set `maxRuntimeMs` EXPLICITLY on
  every code-task dispatch — ceiling ≈ 2× the expected duration; the
  observed legit range is <35 min, so 35–45 min covers almost all code
  tasks and the 1 h default remains only the safety net. Raising the
  ceiling for a child (`auto-limit off`) without a named reason is
  reckless — see §Stall detection. A killed child's partial output is
  salvaged onto the task, never silently lost.

## Verdict artifact format

Persist EVERY verdict (ok:true and ok:false alike) to
`.workflows/reviews/<task-id>.md`, appending each round:

```markdown
# Review — <task-id>
Task: <goal> · Contract: <spec path>

## Round <N> — <date> · <reviewer|quality-reviewer>
**ok: false**
### Findings
1. [P1] <finding> — evidence: <file:line / failing output>

## Round <N+1> — <date> · reviewer
**ok: true**
```

The verdict file is the fixer's input and `/review`'s audit trail.

## Live-smoke layer (UI-facing plans only)

Unit-green ≠ working. Two real-world escapes from plan 20260822-002:
- **F1 form-persist**: unit tests passed, but submitted form data vanished
  on refresh — no persistence binding wired.
- **F2 stale-serve**: dev server returned cached builds after code changes
  — tests ran against the new code, the browser ran the old build.

UI-facing plans include a dedicated live-smoke task (worker role, dispatched
as a standalone task after all other tasks pass mechanical review):
- Start the dev server, drive the real product with a browser (agent-browser
  or equivalent), and record observed states honestly.
- Failures are findings — never rationalized away or softened.
- Evidence file: `.workflows/docs/smoke-<task-id>.md`.
- The smoke task has its own spec, reviewer, and verdict; it gates
  the final `/review`.

### Visual check (the "looks right" layer)

Geometry-green ≠ looks right (plan-008 chrome: every smoke check passed,
  the layout was still terrible). A visual check dispatches a **read-only
  child on `@model:vision`** (image-input model, e.g.
  deepseek-v4-flash-vision-exp): the smoke worker saves screenshots to disk
  (light + dark, key states), the vision child reads each image file via
  the read tool, and reports structured findings against the plan's visual
criteria (alignment, spacing, contrast, hierarchy — per the DESIGN.md/W4
  checklist when one exists). Vision findings are findings — same verdict
  pipeline as smoke. Do NOT trust a text-only model's secondhand judgment
  of a screenshot; either the vision slot reads the pixels or a human does.

**Vision dispatch checklist** (validated live 2026-08-22, plan-009 test
loop — five failure layers, each found the hard way):
1. **Registry thinking**: vision-exp supports high|xhigh only (observed;
  in models/registry.json). Medium fails loudly at dispatch — correct
  behavior, just use high.
2. **Provider data policy**: OpenRouter accounts restricting routing to
  non-training providers get `404 No endpoints available matching your
  guardrail restrictions and data policy` — user-side fix at
  openrouter.ai/settings/privacy.
3. **pi `images.blockImages`**: if true (user-global settings.json), the
  read tool returns "Image reading is disabled" for EVERY model including
  vision children. Must be false for the vision slot to function.
4. **Anti-hallucination probe phrasing**: with a weak prompt, a
  vision-blocked child will FABRICATE a plausible answer from the filename
  (observed: "#ffffff browser" for a never-seen image). Probe prompts must
  demand verifiable specifics (count the nav items, name the section
  headers) or an explicit CANNOT-SEE-IMAGE + error text — never accept a
  one-line "what do you see" answer as proof of pixel access.
5. **Blind tests work**: once unblocked, the vision child independently
  found a known WCAG failure (light muted text) in a blind run, estimating
  contrast ≈2.8:1 from pixels vs the measured 2.61:1, and correctly ranked
  theme severity. Trust it for contrast/hierarchy/coherence findings;
  treat exact hex values as approximate (near-whites indistinguishable).

## Worker→reviewer graph dispatch (verdict-producing)

Sequential dispatch is ONE subagent call: worker + reviewer linked by a
`needs` edge — the reviewer fires mechanically when the worker settles
(no orchestrator turn between) and the worker's output is prepended to
its prompt:

```text
subagent({
  autoAwait: true,
  tasks: [
    { id: "worker-<task-id>", agent: "worker-<task-id>", prompt: "@role:worker",
      write: true, thinking: "<from bottleneck tag>",
      task: `Implement TASK <N>: <goal>. First read .workflows/specs/<task-id>.spec ...` },
    { id: "review-<task-id>", agent: "review-<task-id>", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"],
      thinking: "high",            // xhigh when the task tag is 🔴 BLOCKING
      needs: ["worker-<task-id>"],
      task: `Mechanical verification for TASK <N>: <goal>.
The worker's report is prepended above — verify against the contract, not
the self-report: read .workflows/specs/<task-id>.spec yourself, then run
in order, stop at first failure: agent-spec lifecycle, guard, tdd-guard
(if installed), project checks (tests, lint, typecheck, build).
End with the Verdict block (ok: true|false + findings with evidence).` },
  ],
})
```

A failed or blocked worker auto-aborts the reviewer node — the abort is
the orchestrator's failure signal (no verdict exists; inspect the
worker's output directly). Re-review rounds after a fix re-dispatch the
reviewer standalone (single-task form, no `needs`).

For wave reviewers (verdicts per task), the task text must end:
"Report per task: TASK <n>: ok <true|false> + findings. End with one
Verdict block per task."

## Fix-round dispatch shape

```text
subagent({
  agent: "fix-<task-id>-<N>",
  prompt: "@role:worker",
  write: true,
  thinking: "high",            // fix rounds get high thinking
  autoAwait: true,
  task: `Fix round <N> for TASK <T>: <goal>.

## Context pack
<same pack as the original worker dispatch — files, seam, env, dead ends>

## Salvage (previous worker's final report, verbatim)
<the prior worker's Files Changed + Notes + deviations — start from this
map, not from zero; do not re-derive what it already established>

## Rejection evidence (verbatim from the reviewer)
<the reviewer's findings + evidence, pasted verbatim>
Full verdict: .workflows/reviews/<task-id>.md

Correct ONLY what the findings name — same contract, same boundaries
(.workflows/specs/<task-id>.spec). No refactors, no drive-by fixes.
Re-run the verification pipeline after fixing.

Verify: agent-spec lifecycle .workflows/specs/<task-id>.spec --code . && <project test cmd>`,
})
```

Then re-dispatch the reviewer standalone (round N+1: single-task form,
no `needs`) — **delta re-review**: it verifies the fix diff
(`git diff <roundN>..<roundN+1>` on the task branch) on top of the verdict
file chain, plus a full pipeline re-run only when the fix touched shared
code. Repeat until ok:true or cap.
At the cap: mark ❌ FAILED, append the final round, present the verdict
chain to the human (every finding + what was attempted).

## Dispatch failure taxonomy (six classes) & the inline/worker value matrix

Dogfooded on MorphEditor plan 20260822-008: 5 of 7 implementation
dispatches misfired with the SAME class before the pattern was named.
Classify every misfire before re-dispatching — the class decides the fix.

| # | Class | Signature | Fix |
|---|---|---|---|
| 1 | wrong-artifact | Output exists but wrong shape/location (e.g. plan doc where code was asked) | Re-dispatch with explicit artifact path + format |
| 2 | budget-exhaustion | stopReason=length; reasoning ate the budget before the first write | Explicit line budget + "write early" instruction |
| 3 | capability-gap | Model/thinking route lacks what the task needs (tool schema missing, thinking level unsupported) | Change model/thinking at dispatch — never retry same route |
| 4 | grounding-gap | Artifact cites facts not on disk (hallucinated APIs, invented conventions) | Pre-inline the scout facts; re-dispatch |
| 5 | **workflow-hijack** | Worker converts an implementation task into a research/planning doc — zero production files; may write into orchestrator-owned dirs (`.workflows/scout/`, `specs/`) | Two strikes → **inline**; salvage the research as scout facts |
| 6 | silent-death | Session/tool dies mid-run; extension may even report success | Verify artifacts on disk, never trust 'succeeded'; recover from child session JSONL |

### The open-ended/bounded split (class-5 root cause)

The standard slot (cheap model) lands **bounded** tasks — ports, mirrors,
verbatim implementations with a PoC or spec as source — first try. It
**misfires on open-ended integration/design tasks** ("wire the modules
together", "make it work") because ambiguity makes research-documents the
model's safest completion. Prompt framing does NOT reliably fix this (the
plan-008 T4 round 3 had every fact pre-inlined and still produced research).

**Routing rule (ROUTE, decided at plan time — not mid-flight)**: the
planner writes `ROUTE:inline` or `ROUTE:worker` per task using the
open-endedness checklist — more than one integration seam NOT named in
Allowed Changes, UI/UX judgment required, or cross-module wiring →
`ROUTE:inline` (orchestrator-inline, or the `strong` slot with a full
context pack when the orchestrator context must be protected). Bounded
port/mirror/doc tasks → `ROUTE:worker` on the `standard` slot. Evidence
(plan-034 T4, 2026-09-08): the open-ended/bounded rule existed but was a
mid-flight judgment call — T4 was dispatched to a worker anyway, misfired,
and the salvaged 90% was finished inline faster than a fix round could
re-dispatch. Salvage rule: a class-5 misfire's research output is usually
high quality — mine it as scout facts for the inline implementation
instead of discarding.

### Misfire accounting (mechanical, per run)

Every dispatch misfire costs ~10–25 min wall + a wasted worktree. Record
in LOG.md per task: `T<N> misfire x<K> (class #<n>: <one-line>)` — the
ledger is how the taxonomy gets validated across plans. (See
`models/registry.json` + dispatch telemetry for the model-level view.)

## Worktree hygiene (disk + end-state)

Write agents run in isolated worktrees (`<repo>/.git/subagents/<run>/<task>`,
branch `subagents/<run>/<task>`). Cleanup is a shared responsibility:

1. **Automatic (extension ≥1.3.32)** — after `git merge --no-ff <branch>`
   the extension reaps merged branches + dirs at the next session start
   (`cleanupMerged`, live runs protected via `skipBranches`); crashed
   children get their uncommitted work committed and the branch kept,
   dir dropped (`reapDeadWorktrees`); stale shells swept (`sweepStale`).
2. **Manual safety net** — a crashed *parent* session leaves leftovers
   (the auto-clean never ran). At SHIP ritual, or anytime `.git/subagents`
   is non-empty:
   `node <pi-workflows>/scripts/cleanup-worktrees.sh [repo]`
   — merged branches removed, unmerged ones reported (exit 2, never
   auto-deleted), live runs (< 30 min old) skipped.
3. **SHIP-ritual end-state check** (extend the .workflows check): besides
   `specs/` empty and no stray plan.md, assert `git branch --list
   'subagents/*'` is empty and `.git/subagents/` absent. A leftover
   unmerged branch at SHIP is a signal — either a misfire whose research
   was salvaged (discard after confirming the salvage landed) or real
   unmerged work (merge or explicitly defer, note in LOG.md).

Unmerged-branch rule: a branch whose only unique commits are misfire
   artifacts (research docs, planning files) is discarded once its content
   is salvaged into `.workflows/scout/` — the worktree ledger entry in
   LOG.md records what was salvaged where.

## Stall detection & ceilings (2026-09-08 economics)

Ledger evidence: six 60-min ceiling kills plus one 141.8-min run with 15
turns (~9.5 min/turn) ≈ 10.4 h of pure stall across recorded history — two
classes, both invisible until the ceiling fires: **hangs** (~40 turns:
wedged probes, dead waits) and **thrash** (~190 turns: high activity, no
convergence). The worker stuck-protocol cannot catch either (a hung child
sends no HELP; a thrashing child feels productive).

Doctrine while a write run is in flight:

1. **Explicit ceiling per dispatch** — `maxRuntimeMs` ≈ 2× expected
   duration (35–45 min covers the observed legit range for code tasks;
   bounded doc/test tasks 10–20 min). Never ride the 1 h default on
   purpose; never raise it without a named reason.
2. **Turn-gap check in the slice loop** — the await-economy slice loop
   already wakes you periodically; at each wake, check the run's live
   children for progress (child session JSONL tail, or the dispatch
   ledger). A child with no new turn in ~10 min gets ONE steer message
   ("state hypothesis + next step"). A second silent slice → abort +
   salvage. Plan-034 T4 proved a 90%-done aborted child is recoverable
   and valuable — aborting late-but-not-too-late is a win, not a loss.
3. **Salvage before redispatch** — an aborted child's worktree branch +
   report are the input to the next attempt (escalation-shape salvage,
   also for stalls); never redispatch from zero.
4. **Record it** — LOG.md: `T<N> stall-abort at <mm> min (hang|thrash),
   salvaged <what>`. The hang-vs-thrash split is the evidence that decides
   whether the next rung is a watchdog extension feature or tighter
   dispatch shaping.

A formal watchdog extension (turn-gap detection wired into the extension,
not the orchestrator's slice loop) remains parked as V2 — the doctrine
above is the manual floor that recovers most of the cost today.

## Stuck handling & escalation

Workers carry the stuck protocol (agents/worker.md): named stall signals →
ONE structured HELP via ask_parent (workers dispatch with
`allowIntercom: true`; reviewers stay silent — their verdict is the
escalation channel). When a HELP wakes you (inside an await or a notice):

1. **Reply fast** — the child is parked waiting. A decision beats a
   perfect decision; the HELP shape gives you options + a recommendation.
2. **Reply with a decision**, exactly one of:
   - **unblock** — answer the blocked-on point, or correct the premise
   - **narrow** — cut scope: which criterion to drop/defer for this round
   - **escalate** — re-dispatch at a stronger slot (below)
   - **abort** — cancel the task; it needs a plan-level decision
   Never reply "figure it out" or "use your judgment" — that is how
   class-5 misfires happen.
3. **Record** — LOG.md one line (`T<N> HELP: <blocked-on> → <decision>`)
   and ledger annotate `<task> blocked` (dispatch-ledger.mjs).

### Escalation matrix

| Signal in HELP / observation | Response |
|---|---|
| contract ambiguity, two readings | **unblock**: you pick the reading, note it as an errata to the spec |
| missing dependency outside Allowed | **narrow** (make it optional + spec errata) or **abort** (spec is wrong) |
| repeated technical failure, coherent report | **escalate** — re-dispatch shape below |
| requirement contradicts spec/plan | **abort** — plan-level decision, human informed |
| no HELP but stalled (watch-children: turns without progress) | steer first ("state hypothesis + next step"), escalate on next check |

### Escalation re-dispatch shape (same contract, stronger slot, salvage prepended)

Mid-run model/thinking switching does not exist in pi-core-subagent — by
design. Escalation = cancel + re-dispatch, with the stuck child's findings
salvaged into the new prompt:

```text
subagent({
  agent: "worker-<task-id>-e<level>", prompt: "@role:worker",
  write: true, thinking: "high" /* xhigh at level 2 */, allowIntercom: true,
  model: "@model:strong",
  task: `TASK <N> (ESCALATED, level <K>): <same goal verbatim>.
Contract: .workflows/specs/<task-id>.spec — unchanged.

## Salvage from the previous attempt (its report, verbatim)
<HELP exchange + prior child's final report / findings>

Known-dead ends (do NOT retry): <from the HELP exchange>.
Decisions already made: <unblock/narrow replies, if any>.`,
})
```

Then the reviewer fires fresh on the new attempt (needs edge or standalone
re-dispatch — never reuse an aborted reviewer's verdict). Cap: 2 escalation
levels; beyond that the task is 🟡/🔴 by nature and goes to the human.

**Ledger outcomes**: `blocked` (HELP sent), `escalated:<from>→<to>` (e.g.
`escalated:standard→strong`). These are the evidence the model registry
needs: a tier that escalates constantly is routed wrong.

### Cross-repo source rule (read the host's rules first)

A task whose Allowed Changes consume another repo as a *source* (vendor
refresh, cross-repo write-back, importing from a sibling) must — at spec
time — read that repo's AGENTS.md and any document it names as governing
the integration, and cite those refs in the spec. Battle: MorphEditor
plan-009 T3 never read Morph's AGENTS.md → never read
`docs/vendor-cookbook.md` → glob-swept 24 unconsumed files into the
vendor pin (the mother's test infra + a showcase whose import was broken
in-tree). The spec-drafter, worker, and reviewer all verified byte-exact
against a wrong-shaped contract.

Self-report is not the only channel — the class-5 agent does not know it
is stuck. While workers can now ask, the orchestrator still watches
(watch-children pane, dispatch ledger) for the silent case; a watchdog
formization remains parked as V2.
