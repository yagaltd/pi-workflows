---
description: "Optimize — run parallel optimization experiments, keep the winner"
model: deepseek/deepseek-v4-flash
thinking: high
restore: true
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

For example, for "API latency":
- Strategy A: Add caching layer
- Strategy B: Optimize database queries
- Strategy C: Parallelize independent requests

Each strategy should target a DIFFERENT bottleneck — no overlap.

## Phase 3: PARALLEL EXPERIMENTS

Spawn one subagent per strategy. Each implements the optimization and benchmarks it.

```
subagent({
  tasks: [
    {
      agent: "worker",
      task: `Experiment: <approach A>
Target metric: <baseline value>

Implement this optimization:
<description of approach A>

Rules:
- Only change files needed for this optimization
- Run the benchmark after implementing
- If it breaks, note the failure and still report
- Do NOT change files for other strategies

Report:
## Experiment: <approach A>
- Change: <what was done>
- Result: <metric = new value> (baseline was <value>)
- Improvement: <+X% / -X% / failed>
- Verdict: <BETTER / WORSE / SAME / BROKEN>`,
      progress: true
    },
    {
      agent: "worker",
      task: `Experiment: <approach B>
Target metric: <baseline value>

Implement this optimization:
<description of approach B>

Rules:
- Only change files needed for this optimization
- Run the benchmark after implementing
- If it breaks, note the failure and still report
- Do NOT change files for other strategies

Report:
## Experiment: <approach B>
- Change: <what was done>
- Result: <metric = new value> (baseline was <value>)
- Improvement: <+X% / -X% / failed>
- Verdict: <BETTER / WORSE / SAME / BROKEN>`,
      progress: true
    },
  ],
  concurrency: 2,
  worktree: true
})
```

Add or remove tasks based on how many strategies exist.
Use `worktree: true` so experiments don't interfere with each other.

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
- **Isolated**: worktree prevents interference between experiments
- **One change at a time**: each strategy only touches its own files
- **Report failures**: if an experiment breaks, report it — don't hide it
- **Winner-based**: only the winning strategy gets integrated
