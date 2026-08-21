---
description: "Init — bootstrap a project: architecture design, folder tree, charter, docs skeleton → hands off to /plan"
---

Bootstrap the project BEFORE any planning or building. Follow the 'init'
skill workflow — load its SKILL.md with the read tool, then execute it.

Quick reference (the skill is normative):

```
1. DECIDE   — stack/domain decisions (grill only unresolved, evidence first)
2. DESIGN   — modules, boundaries (→ future contract Forbidden lists),
              data flow (Mermaid), key decisions → ADRs when 3-criteria
3. TREE     — folder tree proposal → 🛑 human approves architecture + tree
              → seeds .workflows/docs/architecture.md (pre-build!)
4. SCAFFOLD — one worker task: dirs + stubs per the approved tree
              (verdict-gated, docs-tier reviewer)
5. WIRE     — AGENTS.md charter to project root, CONTEXT.md seed,
              README skeleton (per templates/DOCS-POLICY.md), LOG.md line
              → hand off to /plan (contract Boundaries derive from the tree)
```

If the project already has code: run `/audit` first, design only the gaps.

$@
