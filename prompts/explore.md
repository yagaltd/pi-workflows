---
description: "Explore — parallel multi-angle research, kill/pivot/proceed with evidence"
model: deepseek/deepseek-v4-flash
thinking: high
restore: true
---

## Phase 1: DEFINE

Understand what needs to be decided. What question? What would make us confident to proceed or kill?

If the question is clear from the argument, state it and move on. If vague, ask 1 question max.

Identify the **angles** that need exploration. Based on the question, pick the relevant angles from:
- **Codebase architecture** — how is it structured, dependencies, risk boundaries
- **Security** — vulnerabilities, auth, untrusted input, injection surfaces
- **Performance** — bottlenecks, N+1 queries, caching, hot paths
- **Code quality** — error handling, swallowed failures, concurrency issues
- **Web research** — existing solutions, libraries, benchmarks, prior art
- **Feasibility/effort** — what would need to change, scope estimate, risks

Choose 2-4 angles that best match the question. Don't force all of them.

## Phase 2: PARALLEL SUBAGENTS

Spawn one subagent per angle. Each investigates independently with its own expertise.

For **each angle**, pick the best agent type:
- **Architecture/codebase analysis** → use agent that maps codebases (recon or scout)
- **Security** → use a security-focused agent (security-review, bug-hunter, or similar)
- **Performance** → use a performance-focused agent (m10-performance or similar)
- **Code quality** → use quality-reviewer
- **Web research** → use a research-capable agent (scout, researcher, or similar)
- **Feasibility** → use a planning-capable agent

Match the agent to the angle. Don't use generic agents when specialized ones exist.

```
subagent({
  tasks: [
    {
      agent: "recon",
      task: `Analyze codebase architecture for: <question>

Map the structure, identify trust boundaries, state transitions, error boundaries
Find the highest-risk files and patterns
Read key source files to understand current architecture
Check recent git history for related changes
Run existing tests, build, lint to establish baseline

Output: architecture summary, risk map (CRITICAL/HIGH/MEDIUM), file-level findings`,
      progress: true
    },
    {
      agent: "security-review",
      task: `Security review for: <question>

Check for: auth vulnerabilities, untrusted input, injection, JWT/secret handling
Identify trust boundaries and privilege escalation paths
Run dependency scanning if relevant
Validate severe findings for exploitability

Output: findings with severity (CRITICAL/HIGH/MEDIUM), file paths, evidence`,
      progress: true
    },
    {
      agent: "quality-reviewer",
      task: `Quality review for: <question>

Check: error handling (swallowed failures, empty catches), 
concurrency issues, code complexity, domain/ADR fit
Identify patterns that will cause production issues

Output: P0-P3 findings with file paths and evidence`,
      progress: true
    },
  ],
  concurrency: 3
})
```

If the question is about **performance**, replace one angle with a performance agent.
If the question is about **adding a feature**, focus on architecture + feasibility.
If the question is about **investigating a bug**, use security + quality angles.

Adjust the mix. The key is using the right agent for each angle.

## Phase 3: SYNTHESIZE

Combine all subagent outputs into a clear recommendation.

```
## Exploration: <question>

### What we found
- <key finding 1>
- <key finding 2>

### What we don't know
- <unknowns>

### Recommendation
<PROCEED / PIVOT / KILL>: <reason>

### If we proceed
- Scope: <rough estimate>
- Key risks: <risks>
- Suggested next: <next step>
```

## Phase 4: PROTOTYPE (only if human approves)

Build a minimal proof-of-concept.

```
subagent({
  agent: "worker",
  task: `Build a minimal PoC to validate: <question>

Rules:
- Throwaway code, not production
- Just enough to prove feasibility
- Run it and report: does it work? limitations? benchmark numbers?
- If it fails, report why. If it succeeds, show results.`,
  progress: true
})
```

🛑 STOP after synthesis. Wait for human before prototyping.

## Rules

- **Timebox**: minutes, not hours
- **Kill fast**: bad idea → say so clearly
- **No production code**: exploration never commits code
- **Right agent for the angle**: generic agents produce generic results
