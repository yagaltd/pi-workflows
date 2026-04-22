---
name: docs
description: Generate and update project documentation using magic-docs format. Use when the user says "generate docs", "update docs", "create documentation", "write architecture doc", or "magic doc".
user-invocable: true
argument-hint: "<what to document, or 'all' for full project docs>"
---

# Docs Workflow

Generate high-signal project documentation in magic-docs format. Docs should be terse, architecture-focused, and explain WHY things exist.

## What are Magic Docs?

Files that start with `# MAGIC DOC:` are tracked by pi-magic-docs extension. After conversation goes idle, Haiku checks if docs need updating and nudges the agent to refresh them.

Magic doc format:
```markdown
# MAGIC DOC: Title
*Optional instruction line in italics*

Content here...
```

## Phase 1: ASSESS

Determine what docs are needed.

1. **If user says "all"**: Generate standard project docs
2. **If user describes a specific area**: Generate one focused doc
3. **If existing docs exist**: Check if they're current

### Standard doc set for new projects:
- `docs/architecture.md` — system overview, module relationships, data flow
- `docs/decisions.md` — key technical decisions and why they were made
- `docs/onboarding.md` — how to get started, key entry points
- `docs/api.md` — public API surface (if applicable)

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

Write docs in magic-docs format.

### Rules for all docs:
- Start with `# MAGIC DOC: <title>`
- Add optional instruction: `*Focus on <aspect>*`
- Be **terse** — architecture and rationale, not code walkthroughs
- Explain **WHY** things exist, not just WHAT they do
- Never duplicate what's obvious from code
- No changelog-style notes ("Previously...", "Updated to...")
- Delete outdated sections, don't append

### Architecture doc template:
```markdown
# MAGIC DOC: Architecture
*Focus on module relationships, data flow, and key design decisions*

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
# MAGIC DOC: Technical Decisions
*Focus on rationale and trade-offs, not implementation details*

## <Decision Topic>
- **Decision**: <what was chosen>
- **Why**: <rationale>
- **Alternatives considered**: <what else was evaluated>
- **Trade-offs**: <what we gained/lost>
```

### Onboarding doc template:
```markdown
# MAGIC DOC: Onboarding
*Focus on getting productive quickly*

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

- [ ] Each doc starts with `# MAGIC DOC:` header
- [ ] Docs are terse (not verbose code walkthroughs)
- [ ] Focus on WHY, not WHAT
- [ ] No outdated information
- [ ] No changelog notes
- [ ] Instructions line (if any) is in italics

## Phase 5: PRESENT

Show the human what was generated:

```
## Docs Generated

### docs/architecture.md
- MAGIC DOC header ✅
- Covers: module structure, data flow, key decisions
- Focus: system design and rationale

### docs/onboarding.md
- MAGIC DOC header ✅
- Covers: quick start, key files, mental model
- Focus: getting productive quickly
```

🛑 **STOP HERE.** Wait for human approval.
Docs will auto-update via magic-docs after future conversations.

## Rules

- **Cheap model is fine for docs** — docs don't need deep reasoning, just accurate summarization
- **Terse over comprehensive** — high signal, low noise
- **Architecture over code** — explain WHY, not WHAT
- **Current state only** — no history, no changelog
- **Magic-docs compatible** — always use proper headers
- **One doc per concern** — don't mix architecture with onboarding
