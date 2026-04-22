---
name: docs-check
description: Check if tracked magic-docs need updating after a task completes. Run automatically by /next.
user-invocable: false
---

# Auto Docs Check

After a task completes, check if any `# MAGIC DOC:` files need updating.

## When Called

This runs automatically after `/next` completes a task. It can also be called manually.

## Process

1. Find all `# MAGIC DOC:` files in the project:
   ```bash
   grep -rl "^# MAGIC DOC:" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v .git
   ```

2. If no magic docs found, skip silently.

3. Read recent conversation context (last significant changes).

4. Decide: does any doc need updating?
   - New modules/files created?
   - Architecture decisions made?
   - Key patterns changed?
   - Dependencies added/removed?

5. If yes: run `/docs <changed-area>` to update relevant docs.

6. If no: skip silently.

## Gate Logic (cheap model)

Use this prompt to decide:

```
Given these tracked docs:
- docs/architecture.md — system overview, module relationships
- docs/onboarding.md — quick start, key files

And these recent changes:
<list of files changed, what was built>

Does any doc need updating? Answer YES or NO with brief reason.
Only YES if there's a meaningful architectural or structural change.
```

## Rules

- **Cheap model for gate** — this is a yes/no decision, not deep reasoning
- **Only update if meaningful** — small fixes don't need doc updates
- **Terse updates** — edit in-place, don't rewrite whole docs
- **Skip silently if no change** — don't pollute conversation with "docs are fine"
