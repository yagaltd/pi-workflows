---
name: docs
description: Generate and update project documentation. Use when the user says "generate docs", "update docs", "create documentation", "write architecture doc", or "document this".
user-invocable: true
argument-hint: "<what to document, or 'all' for full project docs>"
---

# Docs Workflow

Generate high-signal project documentation. Docs should be terse, architecture-focused, and explain WHY things exist.

## Phase 1: ASSESS

Determine what docs are needed.

1. **If user says "all"**: Generate standard project docs
2. **If user describes a specific area**: Generate one focused doc
3. **If existing docs exist**: Check if they're current

### Standard doc set for new projects:
- `.workflows/docs/architecture.md` — system overview, module relationships, data flow
- `.workflows/docs/decisions.md` — key technical decisions and why they were made
- `.workflows/docs/onboarding.md` — how to get started, key entry points
- `.workflows/docs/api.md` — public API surface (if applicable)

## Phase 2: SCOUT

Before writing, understand the codebase.

1. **Map the structure**:
   ```bash
   find . -type f -name "*.rs" -o -name "*.ts" -o -name "*.js" -o -name "*.py" | head -50
   ls -la
   cat Cargo.toml / package.json / pyproject.toml 2>/dev/null
   ```

2. **Find key patterns**:
   - Entry points (main.rs, index.ts, app.py)
   - Module structure
   - Public APIs
   - Configuration
   - Tests structure

3. **Read existing docs** if any:
   ```bash
   find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*"
   ```

4. **Check git history** for context:
   ```bash
   git log --oneline -20
   ```

## Phase 3: GENERATE

Ensure the `.workflows/docs/` directory exists:

```bash
mkdir -p .workflows/docs
```

Write docs. Terse, architecture-focused.

### Rules for all docs:
- Be **terse** — architecture and rationale, not code walkthroughs
- Explain **WHY** things exist, not just WHAT they do
- Never duplicate what's obvious from code
- No changelog-style notes ("Previously...", "Updated to...")
- Delete outdated sections, don't append
- One doc per concern — don't mix architecture with onboarding

### Architecture doc template:
```markdown
# Architecture

## Overview
<1-3 sentences: what this project does and its main purpose>

## Module Structure
<how the code is organized, key modules and their responsibilities>

## Data Flow
<how data moves through the system>

## Key Design Decisions
<why things are the way they are, trade-offs made>

## Entry Points
<where to start reading the code>
```

### Decisions doc template:
```markdown
# Technical Decisions

## <Decision Topic>
- **Decision**: <what was chosen>
- **Why**: <rationale>
- **Alternatives considered**: <what else was evaluated>
- **Trade-offs**: <what we gained/lost>
```

### Onboarding doc template:
```markdown
# Onboarding

## Quick Start
<commands to run, minimal setup>

## Key Files
- `path/to/file` — what it does and why it matters
- `path/to/other` — what it does and why it matters

## Mental Model
<how to think about this codebase>

## Common Tasks
<how to do X, how to do Y>
```

## Phase 4: VERIFY

Check generated docs quality:

- [ ] Docs are terse (not verbose code walkthroughs)
- [ ] Focus on WHY, not WHAT
- [ ] No outdated information
- [ ] No changelog notes

## Phase 5: PRESENT

Show the human what was generated:

```
## Docs Generated

### .workflows/docs/architecture.md
- Covers: module structure, data flow, key decisions
- Focus: system design and rationale

### .workflows/docs/onboarding.md
- Covers: quick start, key files, mental model
- Focus: getting productive quickly
```

🛑 **STOP HERE.** Wait for human approval.

## Rules

- **Cheap model is fine for docs** — docs don't need deep reasoning, just accurate summarization
- **Terse over comprehensive** — high signal, low noise
- **Architecture over code** — explain WHY, not WHAT
- **Current state only** — no history, no changelog
- **One doc per concern** — don't mix architecture with onboarding
