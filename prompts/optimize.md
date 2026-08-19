---
description: "Optimize — run parallel optimization experiments, keep the winner"
---

## Phase 1: DEFINE TARGET AND BASELINE

Identify what to optimize and how to measure it.

1. Read the target from the user (e.g. "API latency", "bundle size", "test speed")
2. Define a measurable metric and benchmark command:
   ```
   # Example:
   npm run bench           # latency benchmark
   du -sh dist/            # bundle size
   vitest run --reporter=json  # test duration
   ```
3. Run the benchmark once to establish a **baseline**:
   ```bash
   # Run benchmark command, record value
   ```
4. Record: `Baseline: <metric> = <value>`

## Phase 2: GENERATE OPTIMIZATION STRATEGIES

Based on the codebase and the target, define 2-4 distinct optimization strategies.

Generate them with hats, pick with the matrix (templates/THINKING-TOOLS.md
§2–3): Green-hat divergence first — strategies must be *radically different
bottlenecks*, not variations of one idea. Then place each on Impact × Effort:
- Quick Wins (high impact, low effort) → always include
- Big Bets (high, high) → include but prototype-sized experiments de-risk them
- Money Pits (low, high) → name and exclude explicitly

For example, for "API latency":
- Strategy A: Add caching layer
- Strategy B: Optimize database queries
- Strategy C: Parallelize independent requests

Each strategy should target a DIFFERENT bottleneck — no overlap.

## Phase 3: PARALLEL EXPERIMENTS (pi-core-subagent)

Spawn one subagent per strategy, in one call. Parallel children share one
filesystem (no worktrees) — **each experiment works ONLY inside its own
directory** (`optimize/exp-a/`, `optimize/exp-b/`, ...) so strategies can't
interfere.

```text
subagent({
  background: false,
  concurrency: 3,
  tasks: [
    {
      agent: "exp-a",
      prompt: "You are an optimization experimenter. Implement exactly one
               strategy inside the directory the task names — never write
               outside it. Run the benchmark after implementing. Report honest
               numbers even when worse; a failed experiment is a result.",
      write: true,
      thinking: "high",
      task: `Experiment: <approach A>
Target metric: <baseline value>
Work ONLY inside optimize/exp-a/ — copy what you must change there first.

Implement this optimization:
<description of approach A>

Verify: <the benchmark command, run from optimize/exp-a/>

Report:
## Experiment: <approach A>
- Change: <what was done>
- Result: <metric = new value> (baseline was <value>)
- Improvement: <+X% / -X% / failed>
- Verdict: <BETTER / WORSE / SAME / BROKEN>`
    },
    {
      agent: "exp-b",
      prompt: "<same experimenter prompt>",
      write: true,
      thinking: "high",
      task: `Experiment: <approach B>
Target metric: <baseline value>
Work ONLY inside optimize/exp-b/. ...same shape as A...`
    },
  ],
})
```

Add or remove tasks based on how many strategies exist.
After the run, check `git status --porcelain` — anything outside an
experiment's own directory is a violation.

## Phase 4: COMPARE AND KEEP WINNER

Compare all experiment results:

```
## Optimization Results

Target: <metric>
Baseline: <value>

| Strategy | Result | Improvement | Verdict |
|---|---|---|---|
| <A> | <value> | <+X%> | BETTER / WORSE / BROKEN |
| <B> | <value> | <+X%> | BETTER / WORSE / BROKEN |

### Winner: <approach>

<reason why this approach won>

### Next step
<integrate winner / combine approaches / discard all>
```

If multiple strategies improved the metric, consider combining them (with care — they may conflict).

🛑 STOP. Present to human. Let them decide: integrate, refine, or discard.

## Rules

- **Measurable**: every experiment must produce a metric value
- **Isolated**: one directory per experiment — experiments never touch each other's files or the main tree
- **One change at a time**: each strategy only touches its own files
- **Report failures**: if an experiment breaks, report it — don't hide it
- **Winner-based**: only the winning strategy gets integrated
