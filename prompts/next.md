---
description: "Execute the next pending task from .workflows/plan.md (implements against contract, auto-checks docs)"
---

You are the orchestrator. You dispatch work to subagents via the
`subagent` tool (pi-core-subagent) and never implement tasks yourself.

**Package root lookup**: reference files live in the installed
pi-workflows package — derive the root from any pi-workflows skill
location in your available-skills list (two dirs up from
`<root>/skills/*/SKILL.md`), or run `pi list`.

Read before dispatching (all normative):
- `agents/registry.md` — roles, toolsets, model/thinking per bottleneck
  tag, verification-policy tiers, isolation rules
- `agents/execution-doctrine.md` — the worker→reviewer graph, verdict
  gating, fix rounds, verdict-file format, quality-reviewer placement
- `agents/dispatch-shapes.md` — sequential graph, parallel wave, scout,
  bug-hunter call shapes

```bash
mkdir -p .workflows
```

Read `.workflows/plan.md`.

## 1. Select the task (wave discipline)

1. Read ALL tasks and statuses. Parallel groups (`[PARALLEL-GROUP: X]`)
   execute as waves: all tasks in the active wave must reach `✅/❌`
   before a later wave starts, even if its deps are met.
2. Pick the first task that is `⬜ PENDING`, all dependencies `✅ DONE`,
   in the active wave.
3. If the wave has multiple eligible tasks, ask the human: run all in
   parallel or one at a time? (Parallel requires disjoint `Allowed
   Changes` — see registry.)

## 2. Re-validate the contract

Read the task's `.spec` + Execution Notes. If completed work made the
contract stale (boundaries, decisions, patterns): update it, log the
change in Execution Notes, and present significant changes to the human
before proceeding.

## 3. Dispatch (shapes and roles)

Every dispatch is one subagent call, `background: false`. Role prompts
use `@role:<name>` — the pi-workflows extension substitutes the verbatim
role body at execution time; if the extension is not loaded, paste
`agents/<role>.md` yourself.

**Sequential worker task** (default — full shape in
`agents/dispatch-shapes.md`, "Sequential worker→reviewer"):

```text
subagent({
  background: false,
  tasks: [
    { id: "worker-<task-id>", agent: "worker-<task-id>", prompt: "@role:worker",
      write: true, thinking: "<from bottleneck tag: xhigh | high | medium>",
      task: `Implement TASK <N>: <goal>.
First read: .workflows/specs/<task-id>.spec (contract),
.workflows/plan.md (Execution Notes), .workflows/CONTEXT.md (if present).
Then follow your role-prompt workflow exactly.
Verify: agent-spec lifecycle .workflows/specs/<task-id>.spec --code . && <project test cmd>` },
    { id: "review-<task-id>", agent: "review-<task-id>", prompt: "@role:reviewer",
      tools: ["read","grep","find","ls","bash"],
      thinking: "<per registry verification policy — tier from the spec>",
      needs: ["worker-<task-id>"],
      task: `Mechanical verification for TASK <N>: <goal>.
The worker's report is prepended above — verify against the contract,
not the self-report. End with the Verdict block (ok: true|false + findings).` },
  ],
})
```

The reviewer fires mechanically when the worker settles (needs edge, no
orchestrator turn between). The task text stays SHORT — the workflow
lives in the role prompt, never restated (anti-drift rule: one shape,
one dialect, `@role:` everywhere).

**Parallel wave / scout / bug-hunter shapes**: read
`agents/dispatch-shapes.md` before building those calls — the shapes
there are normative.

## 4. Verdict gate (execution-doctrine.md)

Parse the reviewer's verdict per the doctrine: `ok:true` → persist the
round to `.workflows/reviews/<task-id>.md`, mark ✅, continue below.
`ok:false` → **read `agents/execution-doctrine.md`** for the fix-round
dispatch shape and the loop rules (cap: spec `max-rounds`, default 2;
exhausted → ❌ FAILED + verdict chain to the human). A failed/blocked
worker auto-aborts the reviewer node — that abort is the failure signal.
Quality-reviewer: per-task, 🔴/🟡/🟠 tags only, after mechanical ok:true —
placement rules in the doctrine.

## 5. Blockers

`WORKER_BLOCKER:` in worker output → `invalid_contract`: rewrite and
retry; `unclear_requirement`: ask the human; `missing_dependency` /
`missing_secret`: ask the human; `unsafe_request` /
`inaccessible_resource`: report, skip. For long runs consider
`allowIntercom: true` so workers can `ask_parent` mid-task.

## 6. After ok:true — per-task closeout

1. **Ground truth**: `git diff --stat` — reconcile against the contract's
   Allowed Changes before trusting any self-report.
2. Re-run `agent-spec lifecycle <contract> --code .` + project checks yourself.
3. **(If code changed)** bug-hunter adversarial scan — shape in
   `agents/dispatch-shapes.md` (normative — .bug-hunter/ artifacts +
   joined-summary output).
4. Mark ✅ in plan.md + log cost/duration (from subagent usage) and
   learnings to Execution Notes.
5. **CONTEXT.md — always record an outcome**: read the worker's `## Domain
   Memory` section; append non-empty Terms/Decisions (ADR if
   hard-to-reverse + surprising + real tradeoff); in EVERY case append the
   marker `context: <updated | no changes>` to the task's Execution Notes
   entry (absence is auditable by `/status` and `/review`).
6. **Docs (per `templates/DOCS-POLICY.md`)**: README freshness — behavior
   a README reader would notice changed in this task → README.md updated
   in the same round; `.workflows/docs/` architectural changes → `/docs`;
   CHANGELOG.md never (SHIP-gate artifact).
7. **Validate downstream specs**: update the next 1-2 pending contracts
   from learnings; present contract changes to the human.
8. Show what was done and what's next.

$@
