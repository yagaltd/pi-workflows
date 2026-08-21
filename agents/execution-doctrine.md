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
   ok:true → persist verdict → ✅ DONE
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
- In parallel waves: parse each task's verdict from the reviewer's output;
  run fix rounds for every ok:false before advancing the wave.

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
