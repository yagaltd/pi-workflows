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

1. Find all `.workflows/docs/*.md` files in the project:
   ```bash
   find . -path '*/docs/*.md' -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null
   ```

2. **README freshness** (per `templates/DOCS-POLICY.md`, pi-workflows
   package): if the completed task changed behavior a README reader would
   notice (new command, changed default, new install step) and README.md
   was not updated in the same round → update it now and flag the miss.
   CHANGELOG.md is never in scope here (SHIP-gate artifact).

3. If no docs found and README is fresh, skip silently.

4. Read recent conversation context (last significant changes).

5. Decide: does any doc need updating?
   - New modules/files created?
   - Architecture decisions made?
   - Key patterns changed?
   - Dependencies added/removed?

6. If yes: run `/docs <changed-area>` to update relevant docs.

7. If no: skip silently.

## Gate Logic (cheap model)

Use this prompt to decide:

```
Given these tracked docs:
- .workflows/docs/architecture.md — system overview, module relationships, folder tree
- README.md — user-facing current state (install, commands, quick start)
- .workflows/docs/onboarding.md — quick start, key files

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
