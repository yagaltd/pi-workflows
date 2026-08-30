---
description: "Explore — parallel multi-angle research, kill/pivot/proceed with evidence"
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

## Phase 2: PARALLEL SUBAGENTS (pi-core-subagent)

Spawn one subagent **per angle, in one call**. There are no agent files —
each angle gets an inline `prompt:` written for it. All angles are read-only
recon (no `write`). Match thinking to the angle: security review deserves
`high`, a quick architecture map is fine at `low`.

```text
subagent({
  autoAwait: true,
  concurrency: 3,
  tasks: [
    {
      agent: "recon-<angle>",
      prompt: "You are a codebase recon analyst. Map structure, trust
               boundaries, state transitions, error boundaries. Cite file:line
               for every claim. Read key sources with offset/limit, never
               whole files. NEVER modify anything — you are read-only.",
      thinking: "medium",
      task: `Analyze codebase architecture for: <question>

Read domain memory first if present (.workflows/CONTEXT.md, .workflows/docs/adr/).
Map the structure, identify trust boundaries, state transitions, error boundaries.
Find the highest-risk files and patterns. Check recent git history for related changes.
Run existing tests, build, lint to establish baseline.

Verify: echo "recon complete"   # read-only angle — output is the deliverable

Output: architecture summary, risk map (CRITICAL/HIGH/MEDIUM), file-level findings`
    },
    {
      agent: "security-<angle>",
      prompt: "You are a security reviewer. Check auth vulnerabilities,
               untrusted input, injection surfaces, JWT/secret handling,
               trust boundaries, privilege escalation paths. Validate severe
               findings for exploitability before reporting them. Cite
               file:line. NEVER modify anything — you are read-only.",
      thinking: "high",
      task: `Security review for: <question>

Output: findings with severity (CRITICAL/HIGH/MEDIUM), file paths, evidence`
    },
    {
      agent: "quality-<angle>",
      prompt: "You are a quality reviewer. Check error handling (swallowed
               failures, empty catches), concurrency issues, complexity,
               domain/ADR fit. High bar: report only findings with concrete
               evidence (path:line) introduced by recent changes. NEVER
               modify anything — you are read-only.",
      thinking: "medium",
      task: `Quality review for: <question>

Output: P0-P3 findings with file paths and evidence`
    },
  ],
})
```

Adapt the mix per question: performance questions get a performance angle
(prompt: "You are a performance analyst..."), feature questions get
architecture + feasibility, bug investigations get security + quality.

## Phase 3: SYNTHESIZE (and persist)

Combine all subagent outputs into a clear recommendation — **and write it
to disk**: exploration findings are durable, versioned knowledge, not chat
ephemera. A later `/idea` must be able to cite them.

```bash
mkdir -p .workflows/knowledge
```

Write `.workflows/knowledge/explore-<YYYYMMDD>-<slug>.md` (commit it with the
project — git versions it):

```markdown
# Exploration: <question>
Date: <date> · Verdict: <PROCEED / PIVOT / KILL>

## Per-angle findings
### <angle 1> (agent: <name>)
<the subagent's findings, condensed — keep its file:line citations>
### <angle 2> ...

## Synthesis
- <key findings>
- <unknowns that remain>

## Recommendation
<verdict + reason>

## If we proceed
- Scope: <estimate> · Key risks: <risks> · Suggested next: <next step>
```

Then append one line to `.workflows/LOG.md` (create if missing):
`<date> EXPLORE <slug> — <verdict>`

If any domain terms crystallized during exploration, add them to
`.workflows/CONTEXT.md` (glossary only).

Present the synthesis to the human:

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

```text
subagent({
  agent: "poc-builder",
  prompt: "You are a prototype builder. Throwaway code, not production. Build
           the smallest thing that tests the hypothesis, run it, report
           honestly. Write only inside the directory the task names.",
  write: true,
  thinking: "medium",
  autoAwait: true,
  task: `Build a minimal PoC to validate: <question>

Work ONLY inside prototype/poc/ — create it if missing, never touch anything outside it.

- Throwaway code, not production
- Just enough to prove feasibility
- Run it and report: does it work? limitations? benchmark numbers?
- If it fails, report why. If it succeeds, show results.

Verify: test -n "$(find prototype/poc -type f -name '*.js' -o -name '*.py' | head -1)"`
})
```

🛑 STOP after synthesis. Wait for human before prototyping.

## Rules

- **Timebox**: minutes, not hours
- **Kill fast**: bad idea → say so clearly
- **No production code**: exploration never commits code outside `prototype/`
- **Right prompt for the angle**: generic agents produce generic results
