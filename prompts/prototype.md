---
description: "Prototype — run parallel A/B/C prototypes, benchmark, keep the winner"
---

## Phase 1: CLASSIFY TARGET

Identify if the target is a **UI** component/page or a **backend**/logic feature.

- **UI target** (component, page, layout, form): use the UI branch — spawn parallel workers each generating a radically different visual design
- **Backend target** (API, logic, algorithm, data flow): use the backend branch — spawn parallel workers each building a PoC with benchmark data
- **If unsure**: ask the user

## Phase 2: BRANCH BY TARGET

### UI Branch: Parallel Visual Designs

Generate N radically different visual approaches. Each worker produces a self-contained, runnable artifact **in its own directory** — parallel children share one filesystem (no worktrees), so directory isolation is mandatory.

Generate the variations with Green-hat divergence (templates/THINKING-TOOLS.md §2 — pi-workflows package, root via a skill location or `pi list`): each direction must differ in *structure* (layout, information architecture, interaction model), not just theming of the same layout — minimal/clean, feature-rich wizard, split-view panel, command-driven, etc.

All prototype workers in one subagent call, inline prompts (no agent files):

```text
subagent({
  background: false,
  concurrency: 3,
  tasks: [
    {
      agent: "proto-a",
      prompt: "You are a prototype builder. Throwaway code, not production.
               Build the variation you are assigned, runnable with one
               command. Write ONLY inside the directory the task names.
               Surface state after every user action. No persistence, no
               polish, no tests.",
      write: true,
      thinking: "medium",
      task: `Build UI variation A for: <target>

Work ONLY inside prototype/variation-a/ — create it, never write outside it.
Design direction: minimal/clean, focus on readability
Mark as throwaway prototype ("PROTOTYPE" in filename). Clearly labeled "Variation A".

Verify: test -f prototype/variation-a/index.html || test -n "$(ls prototype/variation-a)"

Output: what was built, one command to run it, screenshots of key states`
    },
    {
      agent: "proto-b",
      prompt: "<same prototype-builder prompt>",
      write: true,
      thinking: "medium",
      task: `Build UI variation B for: <target>

Work ONLY inside prototype/variation-b/ — never write outside it.
Design direction: feature-rich, multi-step wizard-style
...same rules as A...`
    },
    {
      agent: "proto-c",
      prompt: "<same prototype-builder prompt>",
      write: true,
      thinking: "medium",
      task: `Build UI variation C for: <target>

Work ONLY inside prototype/variation-c/ — never write outside it.
Design direction: sidebar/panel always visible, split view
...same rules as A...`
    },
  ],
})
```

Present all variations side-by-side for the user to pick.

### Backend Branch: Parallel Logic Prototypes

Spawn one subagent per approach. Each builds a minimal PoC in its own
directory and benchmarks it.

```text
subagent({
  background: false,
  concurrency: 3,
  tasks: [
    {
      agent: "exp-a",
      prompt: "You are an experiment builder. Build the smallest PoC that
               tests your assigned hypothesis inside the directory the task
               names — never write outside it. Run the benchmark and report
               honest numbers. Keep it small and fast (< 10 minutes).",
      write: true,
      thinking: "medium",
      task: `Build a prototype for approach: <approach A>
Work ONLY inside prototype/approach-a/.

Hypothesis: <what we expect>
Benchmark: <how to measure>

Verify: <the benchmark command itself, e.g. node prototype/approach-a/bench.js>

Report:
## Prototype: <approach name>
- Build: <what was built>
- Benchmark: <metric = value>
- Pros: <list>
- Cons: <list>
- Verdict: <PROMISING / WEAK / FAILED>`
    },
    { agent: "exp-b", prompt: "<same>", write: true, thinking: "medium",
      task: `Build a prototype for approach: <approach B>
Work ONLY inside prototype/approach-b/. ...same shape as A...` },
  ],
})
```

**Isolation rule** (no worktrees in pi-core-subagent): one directory per
variation/approach. The orchestrator verifies with
`git status --porcelain prototype/` afterwards — any file outside a
variation's own directory is a violation.

Present results side-by-side:

```
## Prototypes

| Approach | Metric | Verdict | Notes |
|---|---|---|---|
| A | <value> | PROMISING | <...> |
| B | <value> | WEAK | <...> |
| C | <value> | FAILED | <...> |

### Winner: <approach>
```

🛑 STOP. Present to human. Let them pick: keep winner, iterate, or discard all.
