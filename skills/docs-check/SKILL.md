---
name: docs-check
description: Check if project docs need updating after a task completes. Run automatically by /next.
user-invocable: false
---

# Auto Docs Check

After a task completes, check if project docs need updating.

## When Called

This runs automatically after `/next` completes a task. It can also be called manually.

## Process

1. Find all `docs/*.md` files in the project:
   ```bash
   find . -path '*/docs/*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null
   ```

2. If no docs found, skip silently.

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
