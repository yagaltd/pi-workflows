---
description: "Prototype — run parallel A/B/C prototypes in parallel, benchmark, keep the winner"
model: deepseek/deepseek-v4-flash
thinking: high
restore: true
---

## Phase 1: CLASSIFY TARGET

Identify if the target is a **UI** component/page or a **backend**/logic feature.

- **UI target** (component, page, layout, form): use the UI branch — spawn parallel workers each generating a radically different visual design
- **Backend target** (API, logic, algorithm, data flow): use the backend branch — spawn parallel workers each building a PoC with benchmark data
- **If unsure**: ask the user

## Phase 2: BRANCH BY TARGET

### UI Branch: Parallel Visual Designs

Generate N radically different visual approaches. Each worker produces a self-contained, runnable HTML file or component.

```
subagent({
  tasks: [
    {
      agent: "worker",
      task: `Build UI variation A for: <target>

Design direction: minimal/clean, focus on readability

Rules:
- Single HTML file or component, runnable with one command
- Mark as throwaway prototype ("PROTOTYPE" in filename)
- Surface state after every user action (print/log current state)
- No persistence, no polish, no tests
- Clearly labeled as "Variation A"

Output: what was built, one command to run it, screenshots of key states`,
      progress: true
    },
    {
      agent: "worker",
      task: `Build UI variation B for: <target>

Design direction: feature-rich, multi-step wizard-style

Rules:
- Single HTML file or component, runnable with one command
- Mark as throwaway prototype ("PROTOTYPE" in filename)
- Surface state after every user action (print/log current state)
- No persistence, no polish, no tests
- Clearly labeled as "Variation B"

Output: what was built, one command to run it, screenshots of key states`,
      progress: true
    },
    {
      agent: "worker",
      task: `Build UI variation C for: <target>

Design direction: sidebar/panel always visible, split view

Rules:
- Single HTML file or component, runnable with one command
- Mark as throwaway prototype ("PROTOTYPE" in filename)
- Surface state after every user action (print/log current state)
- No persistence, no polish, no tests
- Clearly labeled as "Variation C"

Output: what was built, one command to run it, screenshots of key states`,
      progress: true
    },
  ],
  concurrency: 3,
  worktree: true
})
```

Present all variations side-by-side for the user to pick.

### Backend Branch: Parallel Logic Prototypes

Spawn one subagent per approach. Each builds a minimal PoC and benchmarks it.

```
subagent({
  tasks: [
    {
      agent: "worker",
      task: `Build a prototype for approach: <approach A>

Hypothesis: <what we expect>
Benchmark: <how to measure>

Rules:
- Minimal proof-of-concept — no polish, no production code
- Build the smallest thing that tests the hypothesis
- Run the benchmark and record results
- Report: approach name, metric values, pros, cons, verdict
- Keep it small and fast (< 10 minutes)

Output:
## Prototype: <approach name>
- Build: <what was built>
- Benchmark: <metric = value>
- Pros: <list>
- Cons: <list>
- Verdict: <PROMISING / WEAK / FAILED>`,
      progress: true
    },
    {
      agent: "worker",
      task: `Build a prototype for approach: <approach B>

Hypothesis: <what we expect>
Benchmark: <how to measure>

Rules:
- Minimal proof-of-concept — no polish, no production code
- Build the smallest thing that tests the hypothesis
- Run the benchmark and record results
- Report: approach name, metric values, pros, cons, verdict
- Keep it small and fast (< 10 minutes)

Output:
## Prototype: <approach name>
- Build: <what was built>
- Benchmark: <metric = value>
- Pros: <list>
- Cons: <list>
- Verdict: <PROMISING / WEAK / FAILED>`,
      progress: true
    },
    {
      agent: "worker",
      task: `Build a prototype for approach: <approach C>

Hypothesis: <what we expect>
Benchmark: <how to measure>

Rules:
- Minimal proof-of-concept — no polish, no production code
- Build the smallest thing that tests the hypothesis
- Run the benchmark and record results
- Report: approach name, metric values, pros, cons, verdict
- Keep it small and fast (< 10 minutes)

Output:
## Prototype: <approach name>
- Build: <what was built>
- Benchmark: <metric = value>
- Pros: <list>
- Cons: <list>
- Verdict: <PROMISING / WEAK / FAILED>`,
      progress: true
    },
  ],
  concurrency: 3,
  worktree: true
})
```

Use `worktree: true` so each prototype has an isolated filesystem — no interference.

Add or remove tasks based on how many approaches exist.

## Phase 3: COMPARE AND PICK WINNER

Compare results across all prototypes:

```
## Prototype Results

| Approach | Metric | Verdict |
|---|---|---|
| <A> | <value> | PROMISING / WEAK |
| <B> | <value> | PROMISING / WEAK |
| <C> | <value> | PROMISING / WEAK |

### Winner: <approach>

Why: <reason based on benchmark data>

### Next step
<integrate / discard / refine further>
```

🛑 STOP. Present to human. Let them decide: integrate winner, refine, or discard all.

## Rules

- **Parallel**: all approaches run simultaneously, one subagent each
- **Isolated**: worktree prevents file conflicts
- **Measurable**: every prototype must produce a benchmark value
- **Throwaway**: prototype code is temporary, not production
- **Speed**: keep each prototype under 10 minutes
