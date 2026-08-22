# Dispatch shapes — conditional subagent call templates

Loaded on demand by `/next`, `/auto-next`, `/audit`, `/review` when the
specific shape fires. Normative — follow exactly. Role prompts use the
`@role:<name>` convention (resolved mechanically by the pi-workflows
extension; if the extension is absent, paste the verbatim body of
`agents/<name>.md` instead).

The `model:` field in any dispatch shape accepts `@model:<role>` syntax
(resolve-or-loud-fallback, same semantics as agents/registry.md §Model
resolution — unresolvable role → explicit legacy id + WARN, never silent).
Leave `model` empty to inherit the parent session's model.

## Sequential worker→reviewer (one call, graph mode)

The default dispatch: worker and reviewer in ONE `tasks[]` array — the
reviewer's `needs:` edge fires it mechanically when the worker settles
(no orchestrator turn between) and prepends the worker's output to its
prompt:

```text
subagent({
  autoAwait: true,
  cwd: "<absolute repo path>",
  tasks: [
    { id: "worker-<task-id>", agent: "worker-<task-id>", prompt: "@role:worker",
      write: true, thinking: "<from bottleneck tag>",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

TASK <N> of .workflows/plan.md (plan <id>): <goal>. Contract: .workflows/specs/<task-id>.spec. Upstream tasks: <list>.

Implement per contract. First read .workflows/specs/<task-id>.spec
(the workflow is in your role prompt — follow it).` },
    { id: "review-<task-id>", agent: "review-<task-id>", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"], thinking: "high",   // xhigh when tag is 🔴
      needs: ["worker-<task-id>"],
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

Mechanical verification for TASK <N>: <goal>.
The worker's report is prepended above — verify against the contract, not
the self-report: read .workflows/specs/<task-id>.spec yourself, then run
in order, stop at first failure: agent-spec lifecycle, guard, tdd-guard
(if installed), project checks (tests, lint, typecheck, build).
Write tasks: the result carries the child's branch + diffstat — verify
git diff <base>..<branch> against the spec instead of the shared tree
(write work lands on the child's branch, leaving the tree clean).
Read-only tasks: keep dirty-tree verification (in-place children run in
the shared tree, which stays authoritative).
End with the Verdict block (ok: true|false + findings with evidence).` },
  ],
})
```

Notes:
- A failed worker auto-aborts the reviewer (broken upstream must not be
  reviewed) — the abort is your signal the task failed.
- With `autoAwait: true`, the call returns when the whole graph settles.
- **Worktree contract**: a write-capable child runs in
  `<repo>/.git/subagents/<run>/<task>` on branch `subagents/<run>/<task>`;
  the extension tells the child its branch before work, the child runs NO
  branch-switching git commands (no checkout/switch to its branch), and the
  extension auto-commits the child's changes at completion.
- Fix rounds stay follow-up dispatches (per `agents/execution-doctrine.md`);
  re-reviews run standalone (no `needs`).

## Parallel worker wave (one call, graph mode)

All tasks in the wave go in ONE `tasks[]` array. Reviewer follows the wave
as a **`needs:` edge** — pi-core-subagent gates it and prepends the
workers' outputs to its prompt automatically:

```text
subagent({
  autoAwait: true,
  cwd: "<absolute repo path>",
  concurrency: 4,
  tasks: [
    { id: "task-<2>", agent: "worker-task-2", prompt: "@role:worker",
      write: true, thinking: "<per tag>",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

TASK 2 of .workflows/plan.md (plan <id>): <goal>. Contract: .workflows/specs/task-2.spec.

Implement per contract. First read .workflows/specs/task-2.spec
(the workflow is in your role prompt — follow it).` },
    { id: "task-<3>", agent: "worker-task-3", prompt: "@role:worker",
      write: true, thinking: "<per tag>",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

TASK 3 of .workflows/plan.md (plan <id>): <goal>. Contract: .workflows/specs/task-3.spec.

Implement per contract. First read .workflows/specs/task-3.spec
(the workflow is in your role prompt — follow it).` },
    { id: "verify-<2-3>", agent: "reviewer", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"], thinking: "high",
      needs: ["task-2", "task-3"],
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

Mechanical verification for TASK 2 and TASK 3.
First read .workflows/plan.md and the two specs, then run in order, stop at first failure:
1. agent-spec lifecycle .workflows/specs/task-2.spec --code . --format json
2. agent-spec lifecycle .workflows/specs/task-3.spec --code . --format json
3. agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree
4. Project checks (tests, lint, typecheck, build).
Write tasks: each worker's result carries its branch + diffstat — verify
git diff <base>..<branch> against the spec instead of the shared tree.
Read-only tasks: keep dirty-tree verification (in-place children).
Report per task: TASK <n>: ok <true|false> + findings. End with one Verdict block per task.
Verify: agent-spec guard --spec-dir .workflows/specs --code . --change-scope worktree` },
  ],
})
```

Notes:
- **`needs` replaces wave bookkeeping**: the reviewer starts only when all
  workers settle; a failed worker auto-aborts it (a broken upstream must
  not be reviewed) — that abort is your signal the task failed.
- **Worktree contract**: write-capable children run in
  `<repo>/.git/subagents/<run>/<task>` worktrees on branch
  `subagents/<run>/<task>`; the extension tells each child its branch
  before work, children run NO branch-switching git commands, and the
  extension auto-commits each child's changes at completion.
- Hard limits: ≤16 tasks per call, concurrency ≤8.
- **Verdict gating applies per task** — fix rounds per
  `agents/execution-doctrine.md` for every ok:false before advancing.
- **Ship/merge step**: once every verdict passes, the orchestrator merges
  each write task's branch with `git merge --no-ff subagents/<run>/<task>`
  before the ship commit (merged branches + worktree dirs are auto-cleaned).
- Parallel tasks MUST have disjoint `Allowed Changes` (registry isolation
  policy); overlapping boundaries → resequence with a dependency instead.

## Scout dispatch shape

```text
subagent({
  agent: "scout-<task-id>",
  prompt: "@role:scout",
  cwd: "<absolute repo path>",
  thinking: "low",            // cheap recon — see registry
  autoAwait: true,
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
  write: true, thinking: "high", autoAwait: true,
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
  write: true, thinking: "medium", autoAwait: true,
  task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

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

## Spec drafting fan-out (one call, graph mode)

N spec-drafter tasks in ONE `tasks[]` array — one per spec to land. Keep
them independent (disjoint filenames: each drafter writes only its own
spec — isolation policy applies). Every task text carries the same spine:
repo GUARD line, the decision VERBATIM, scout-fact slices pasted inline,
boundaries, and the exact spec filename:

```text
subagent({
  autoAwait: true,
  cwd: "<absolute repo path>",
  concurrency: min(4, N),
  tasks: [
    { id: "spec-<task-1>", agent: "spec-drafter-<task-1>", prompt: "@role:spec-drafter",
      write: true, thinking: "high",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

Draft spec for TASK <N> of .workflows/plan.md (plan <id>): <goal>.

DECISION (verbatim — do not paraphrase): <paste the plan's decision text exactly>.
Scout facts (inline slices): <paste the relevant scout report slices verbatim
  — the spec cites evidence, it does not re-derive it>.
Boundaries: Allowed Changes = <...>; Forbidden = <everything else, incl. ...>.
Output EXACTLY one file: .workflows/specs/<task-id>.spec — write:true is
contract-limited to .workflows/specs/**.` },
    { id: "spec-<task-2>", agent: "spec-drafter-<task-2>", prompt: "@role:spec-drafter",
      write: true, thinking: "high",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

Draft spec for TASK <N+1> of .workflows/plan.md (plan <id>): <goal-2>.

DECISION (verbatim — do not paraphrase): <paste the plan's decision text exactly>.
Scout facts (inline slices): <paste the relevant scout report slices verbatim>.
Boundaries: Allowed Changes = <...>; Forbidden = <...>.
Output EXACTLY one file: .workflows/specs/<task-id-2>.spec.` },
  ],
})
```

The orchestrator reviews each landed spec **mechanically after the
fan-out** — **orchestrator-side is the default** (per spec: GUARD line
present, decision verbatim, boundaries complete, exact filename, spec
frontmatter valid). The `needs:`-edge alternative — one review task
deduping all drafted specs — works too; prefer it when the fan-out is
large and a dedicated reviewer pass is cheaper than an orchestrator
pass. Specs are small; a compact mechanical pass is expected, not a full
reviewer node by default.

## Plan draft delegation (single task)

One `@model:strong` thinking-high task receives scout facts + user goal +
plan format and returns a draft plan — a proposal, never a contract:

```text
subagent({
  autoAwait: true,
  cwd: "<absolute repo path>",
  tasks: [
    { id: "plan-draft-<id>", agent: "plan-draft-<id>",
      model: "@model:strong", write: true, thinking: "high",
      task: `Repo: <absolute repo path> (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).

Draft a plan for: <user goal, verbatim>.
Scout facts (inline slices): <paste domain map + risks + evidence slices verbatim>.
Plan format: <link or paste the plan skeleton — sections, task granularity,
  spec naming scheme>.
Output EXACTLY one file: .workflows/plan-draft-<id>.md. Never write specs —
.workflows/specs/** is off-limits; drafts are proposals, not contracts.` },
  ],
})
```

- **Never dispatched without the adversarial pass** — the draft goes
  through the plan-time grilling (decision tree + domain walk) before any
  task is extracted; delegation covers drafting, never deciding.
- **Never writes specs** — the draft lands in `.workflows/plan-draft-<id>.md`
  only; specs are authored later by spec-drafters from the reviewed plan.
- The orchestrator stays the single writer: it keeps the draft under
  `.workflows/plan-draft-<id>.md` and renders it into `.workflows/plan.md`
  only after the adversarial pass and user sign-off.
