---
name: explore
description: Research, prototype, and validate or kill ideas before committing to build. Use when the user says "explore", "research", "evaluate", "prototype", "should we", "what about", or "investigate".
user-invocable: true
argument-hint: "<question or area to explore>"
---

# Explore Workflow

Research a question, gather evidence, make a confident decision. Kill bad ideas fast.

## Phase 1: DEFINE

Understand what the human needs to decide.

- What question needs answering?
- What would make them confident to **proceed** or **kill** this?
- What are the constraints (time, complexity, dependencies)?

**OUTPUT**: A clear question with success criteria.

If the question is already clear from the argument, state it back briefly and move on. If vague, ask 1-2 clarifying questions max — don't over-interview.

## Phase 2: SCOUT

Gather information from the codebase and any relevant sources.

1. **Handle the input type**:
   - **URL**: fetch with `bash` (`curl -sL <url> | head -1000`), extract key info
   - **GitHub repo**: `bash` (`git clone <url> /tmp/explore-<name> && cd /tmp/explore-<name>`), then scout
   - **Local path**: `find`, `grep`/`rg` in the specified directory
   - **Vague description**: search current codebase + online if needed
   - **Multiple inputs**: handle each in sequence or dispatch parallel scouts

2. **Map the territory**:
   - `find`, `grep`/`rg` for relevant files, patterns, modules
   - Read key files to understand current architecture
   - Check dependencies (package.json, Cargo.toml, etc.)
   - Look at recent git history for related changes

3. **Gather evidence**:
   - How is this currently done (if at all)?
   - What would need to change?
   - What are the risks and unknowns?
   - Are there existing libraries/solutions?

4. **Check feasibility**:
   - Run any relevant existing tests: `npm test`, `cargo test`, etc.
   - Check build/lint status: `npm run lint`, `cargo check`, etc.
   - Note any existing failures that would complicate the work.

**OUTPUT**: Structured findings — what exists, what's missing, what's risky.

## Phase 3: SYNTHESIZE

Combine findings into a clear recommendation.

Present to the human:

```
## Exploration: <question>

### What we found
- <key finding 1>
- <key finding 2>
- ...

### What we don't know
- <unknown 1>
- <unknown 2>

### Recommendation
<PROCEED / PIVOT / KILL>: <reason>

### If we proceed
- Estimated scope: <rough estimate>
- Key risks: <risks>
- Suggested next step: <what to do next>
```

🛑 **STOP HERE.** Present findings and wait for human decision.
Do NOT proceed to prototype without explicit approval.

## Phase 4: PROTOTYPE (only if human approves)

Build a minimal proof-of-concept. This is throwaway code.

1. **Scope the prototype**: What's the minimum that proves feasibility?
2. **Build it**: Quick and dirty. No tests needed. No polish.
3. **Run it**: Does it work? What are the limitations?
4. **Clean up**: If it fails, delete and report why. If it succeeds, show the human.

**OUTPUT**: Working prototype or "killed — reason: ..."

🛑 **STOP HERE.** Show prototype result to human.
Human decides: ship it as-is, turn it into a proper feature, or throw away.

## Rules

- **Timebox**: Exploration should take minutes, not hours. If you're deep in implementation, you've gone too far.
- **Kill fast**: If evidence says "bad idea", say so clearly. Don't sugar-coat.
- **No commitments**: Exploration never commits production code. Prototype code is temporary.
- **Stay on topic**: Answer the question that was asked. Don't scope-creep into related areas.
- **Use deterministic tools**: Run existing tests, linters, type checkers to ground findings in facts, not guesses.
