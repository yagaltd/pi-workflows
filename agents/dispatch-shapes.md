# Dispatch shapes — conditional subagent call templates

Loaded on demand by `/next`, `/auto-next`, `/audit`, `/review` when the
specific shape fires. Normative — follow exactly. Role prompts use the
`@role:<name>` convention (resolved mechanically by the pi-workflows
extension; if the extension is absent, paste the verbatim body of
`agents/<name>.md` instead).

## Sequential worker→reviewer (one call, graph mode)

The default dispatch: worker and reviewer in ONE `tasks[]` array — the
reviewer's `needs:` edge fires it mechanically when the worker settles
(no orchestrator turn between) and prepends the worker's output to its
prompt:

```text
subagent({
  background: false,
  cwd: "<absolute repo path>",
  tasks: [
    { id: "worker-<task-id>", agent: "worker-<task-id>", prompt: "@role:worker",
      write: true, thinking: "<from bottleneck tag>",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel match before anything).

TASK <N> of .workflows/plan.md (plan <id>): <goal>. Contract: .workflows/specs/<task-id>.spec. Upstream tasks: <list>.

Implement per contract. First read .workflows/specs/<task-id>.spec
(the workflow is in your role prompt — follow it).` },
    { id: "review-<task-id>", agent: "review-<task-id>", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"], thinking: "high",   // xhigh when tag is 🔴
      needs: ["worker-<task-id>"],
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel match before anything).

Mechanical verification for TASK <N>: <goal>.
The worker's report is prepended above — verify against the contract, not
the self-report: read .workflows/specs/<task-id>.spec yourself, then run
in order, stop at first failure: agent-spec lifecycle, guard, tdd-guard
(if installed), project checks (tests, lint, typecheck, build).
End with the Verdict block (ok: true|false + findings with evidence).` },
  ],
})
```

Notes:
- A failed worker auto-aborts the reviewer (broken upstream must not be
  reviewed) — the abort is your signal the task failed.
- With `background: false`, the call returns when the whole graph settles.
- Fix rounds stay follow-up dispatches (per `agents/execution-doctrine.md`);
  re-reviews run standalone (no `needs`).

## Parallel worker wave (one call, graph mode)

All tasks in the wave go in ONE `tasks[]` array. Reviewer follows the wave
as a **`needs:` edge** — pi-core-subagent gates it and prepends the
workers' outputs to its prompt automatically:

```text
subagent({
  background: false,
  cwd: "<absolute repo path>",
  concurrency: 4,
  tasks: [
    { id: "task-<2>", agent: "worker-task-2", prompt: "@role:worker",
      write: true, thinking: "<per tag>",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel match before anything).

TASK 2 of .workflows/plan.md (plan <id>): <goal>. Contract: .workflows/specs/task-2.spec.

Implement per contract. First read .workflows/specs/task-2.spec
(the workflow is in your role prompt — follow it).` },
    { id: "task-<3>", agent: "worker-task-3", prompt: "@role:worker",
      write: true, thinking: "<per tag>",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel match before anything).

TASK 3 of .workflows/plan.md (plan <id>): <goal>. Contract: .workflows/specs/task-3.spec.

Implement per contract. First read .workflows/specs/task-3.spec
(the workflow is in your role prompt — follow it).` },
    { id: "verify-<2-3>", agent: "reviewer", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"], thinking: "high",
      needs: ["task-2", "task-3"],
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel match before anything).

Mechanical verification for TASK 2 and TASK 3.
First read .workflows/plan.md and the two specs, then run in order, stop at first failure:
1. agent-spec lifecycle .workflows/specs/task-2.spec --code . --format json
2. agent-spec lifecycle .workflows/specs/task-3.spec --code . --format json
3. agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
4. Project checks (tests, lint, typecheck, build).
Report per task: TASK <n>: ok <true|false> + findings. End with one Verdict block per task.
Verify: agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree` },
  ],
})
```

Notes:
- **`needs` replaces wave bookkeeping**: the reviewer starts only when all
  workers settle; a failed worker auto-aborts it (a broken upstream must
  not be reviewed) — that abort is your signal the task failed.
- Hard limits: ≤16 tasks per call, concurrency ≤8.
- **Verdict gating applies per task** — fix rounds per
  `agents/execution-doctrine.md` for every ok:false before advancing.
- Parallel tasks MUST have disjoint `Allowed Changes` (registry isolation
  policy); overlapping boundaries → resequence with a dependency instead.

## Scout dispatch shape

```text
subagent({
  agent: "scout-<task-id>",
  prompt: "@role:scout",
  cwd: "<absolute repo path>",
  thinking: "low",            // cheap recon — see registry
  background: false,
  task: `Investigate <area> for TASK <N>: <goal>.

First read domain memory (if present): .workflows/CONTEXT.md,
.workflows/CONTEXT-MAP.md, .workflows/docs/adr/*.md — then recon the area.
Output format per your role prompt.`,
})
```

After a scout settles, persist its report verbatim to
`.workflows/knowledge/scout-<task-id>.md` (mkdir -p the dir) — scouts are
read-only by design; the orchestrator is the single writer. Later tasks,
contracts, and `/idea` sessions cite these files instead of re-running recon.

## Bug-hunter dispatch shape (after code changed / at review)

The `bug-hunter` binary is an installer, not a scanner — dispatch the
runtime. If the bug-hunter skill is not installed, skip with a note.

```text
subagent({
  agent: "bug-hunter-<task-id>",
  cwd: "<absolute repo path>",
  prompt: "You are the bug-hunter runtime. Read ~/.pi/agent/skills/bug-hunter/SKILL.md
           (or ./.pi/skills/bug-hunter/SKILL.md) and modes/local-sequential.md,
           then follow the protocol EXACTLY: scan-only, single-pass, fail
           closed. Write canonical artifacts under .bug-hunter/. NEVER fix,
           never commit.",
  write: true, thinking: "high", background: false,
  task: "Scan the current changes (git diff — or the review diff for /review)
          for defects. Report findings with severity, file paths, and evidence.
          Output the joined summary: confirmed / dismissed / manualReview counts."
})
```

## Live-smoke dispatch shape (UI-facing plans)

Dispatched as a standalone task after all other tasks pass mechanical
review. The smoke task has its own spec, reviewer, and verdict — it gates
the final `/review`.

```text
subagent({
  agent: "smoke-<task-id>",
  prompt: "@role:worker",
  cwd: "<absolute repo path>",
  write: true, thinking: "medium", background: false,
  task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel match before anything).

TASK <N> of .workflows/plan.md (plan <id>): Live-smoke <goal>. Contract: .workflows/specs/task-smoke-<id>.spec.

Start the dev server, drive the real product with a browser, and record
observed states honestly. Unit-green ≠ working — verify that the build
serves the expected code and that user-visible flows (form submit,
navigation, state persistence) behave correctly.

Failures are findings — never rationalized away or softened. Record
evidence to .workflows/docs/smoke-<task-id>.md.`,
})
```

After the smoke task settles, dispatch its reviewer standalone (same
shape as a fix-round re-review). The smoke verdict gates the final
`/review` — a failing smoke means the plan is not done.
