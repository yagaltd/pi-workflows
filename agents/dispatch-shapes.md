# Dispatch shapes — conditional subagent call templates

Loaded on demand by `/next`, `/auto-next`, `/audit`, `/review` when the
specific shape fires. Normative — follow exactly. Role prompts use the
`@role:<name>` convention (resolved mechanically by the pi-workflows
extension; if the extension is absent, paste the verbatim body of
`agents/<name>.md` instead).

## Parallel worker wave (one call, graph mode)

All tasks in the wave go in ONE `tasks[]` array. Reviewer follows the wave
as a **`needs:` edge** — pi-core-subagent gates it and prepends the
workers' outputs to its prompt automatically:

```text
subagent({
  background: false,
  concurrency: 4,
  tasks: [
    { id: "task-<2>", agent: "worker-task-2", prompt: "@role:worker",
      write: true, thinking: "<per tag>",
      task: `Implement TASK 2: <goal>. First read .workflows/specs/task-2.spec
(the workflow is in your role prompt — follow it).` },
    { id: "task-<3>", agent: "worker-task-3", prompt: "@role:worker",
      write: true, thinking: "<per tag>",
      task: `Implement TASK 3: <goal>. First read .workflows/specs/task-3.spec ...` },
    { id: "verify-<2-3>", agent: "reviewer", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"], thinking: "high",
      needs: ["task-2", "task-3"],
      task: `Mechanical verification for TASK 2 and TASK 3.
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
