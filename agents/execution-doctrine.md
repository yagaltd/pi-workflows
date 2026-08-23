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
  `ok:false` (CHANGES_REQUESTED) triggers a fix round with the same cap —
  only after mechanical ok:true.
- **Quality-reviewer placement — per-task, tag-gated, never per-wave.**
  Dispatch a quality-reviewer only for tasks whose bottleneck tag is
  🔴/🟡/🟠, as a standalone follow-up AFTER the mechanical reviewer returns
  `ok:true` — it cannot be a `needs` node because it is conditional on the
  verdict. ⚪ tasks skip it (mechanical verdict + `/review` suffice).
  Never run it per-wave: wave tasks are independent parallel tasks with
  disjoint boundaries — quality-judging unrelated changes together is the
  wrong granularity. `/review` stays the whole-plan quality gate, where
  integration effects are judged.
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
  background: false,
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
  background: false,
  task: `Fix round <N> for TASK <T>: <goal>.

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
no `needs`). Repeat until ok:true or cap.
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

**Routing rule**: open-ended tasks (Tier B 🟡/🔴 with design decisions, any
"integration" task) go **orchestrator-inline** or to the `strong` slot;
bounded port/mirror/doc tasks go to workers on the `standard` slot. Salvage
rule: a class-5 misfire's research output is usually high quality — mine it
as scout facts for the inline implementation instead of discarding.

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

Self-report is not the only channel — the class-5 agent does not know it
is stuck. While workers can now ask, the orchestrator still watches
(watch-children pane, dispatch ledger) for the silent case; a watchdog
formalization is parked in docs/20260822-improvements-test-first-and-escalation.md.
