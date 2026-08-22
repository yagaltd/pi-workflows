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
   ok:true → orchestrator runs tooling/verify-landing.sh <repo> <allowed>... < claims.txt (tripwire)
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
  — the orchestrator runs `tooling/verify-landing.sh <repo> <allowed>...`
  with claimed files on stdin. ALARM = phantom work → the worker's report
  is untrusted → verify cwd → redispatch with explicit per-task cwd.
  Fake work is never reviewed. The script's `--selftest` mode is the
  authoritative verification for fixture-based contract scenarios that
  agent-spec lifecycle cannot cover.
- **Consolidated final review**: when parallel waves share one worktree,
  wave-time `agent-spec guard` output is union-noise (5/6 specs failing
  because sibling tasks are still pending). The consolidated full-tree
  review at plan end — running guard once over all specs against the
  complete worktree — is the review of record. Wave reviewers note
  "union-noise (D7a)" and proceed; the final `/review` catches everything.
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
- **Ship ritual archive step**: at SHIP, consumed specs move to
  `.workflows/archive/done/<plan-id>/specs/` — reviewers and guard layers see
  only live specs.
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
