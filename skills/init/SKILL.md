---
name: init
description: "Bootstrap a project: architecture design, folder tree, charter, docs skeleton — before any planning or building. Use for 'init project', 'set up this project', 'scaffold', 'new project setup', or when starting work on an empty/new repo."
user-invocable: true
argument-hint: "<project description>"
---

# Init Workflow — project bootstrap

`/init` is the step BEFORE `/idea`/`/plan`: it designs the structure the
contracts will later enforce. Nothing here builds features — it produces
an approved architecture, an approved folder tree, the charter, and doc
skeletons, then hands off to `/plan`.

```
Phase 1 DECIDE  → stack/domain decisions (grill protocol)
Phase 2 DESIGN  → architecture: modules, boundaries, data flow, ADRs
Phase 3 TREE    → folder tree proposal → approval → architecture.md seeded
Phase 4 SCAFFOLD→ worker task: dirs + stubs per the approved tree
Phase 5 WIRE    → charter + CONTEXT.md + README skeleton → /plan
```

## Phase 1: DECIDE — evidence first, grill what remains

Read whatever exists (repo, docs, prior CONTEXT.md — an empty repo is
fine). Identify the stack/domain decisions that are still open. Ask only
the unresolved ones, per the grill protocol (material, grounded,
answerable; recommended + evidence + AFK default). Typical: language,
package manager, test runner, key dependency choices, module layout
philosophy (single-entry vs multi-package, library vs app).

## Phase 2: DESIGN — architecture before code

Produce a compact architecture design:

- **Modules** — name, responsibility, one sentence each
- **Boundaries** — what each module may NOT touch (these become contract
  Forbidden lists and agent-spec guard checks later)
- **Data flow** — a Mermaid diagram if non-trivial
- **Key decisions** — one line each with rationale; promote to ADRs
  (`.workflows/docs/adr/`) when hard to reverse + surprising + a real
  tradeoff

## Phase 3: TREE — the folder tree, approved as an artifact

Propose the folder tree — the thing contract Boundaries will later derive
from:

```
src/
  <module-a>/     # <responsibility>
  <module-b>/     # <responsibility>
tests/
docs/             # if the user wants user-facing docs (see DOCS-POLICY)
```

Tree rules:
- Every directory maps to a module from Phase 2 (no junk drawers)
- Tests mirror src/ layout
- `.workflows/` exists for workflow state (gitignore it unless the team
  wants it shared)
- Present the tree with the architecture; 🛑 GATE: human approves BOTH

On approval, write `.workflows/docs/architecture.md` using the `/docs`
skill's architecture template (Overview, Module Structure, Data Flow, Key
Design Decisions, Entry Points) — **seeded now, before any build**, so
`/docs` and docs-check update a living document instead of reconstructing
one later. Append the approved tree under `## Folder Tree`.

## Phase 4: SCAFFOLD — one worker task creates the skeleton

Dispatch ONE worker (inline prompt, `write: true`, medium thinking — the
shape follows `agents/dispatch-shapes.md` conventions; use `@role:worker`):

```text
task: `Scaffold the approved project tree.
Read .workflows/docs/architecture.md (approved architecture + tree).
Create every directory from the tree with a .gitkeep or minimal stub
file per module (comment header naming the module's responsibility —
no implemented code). Create tests/ mirroring src/.

Boundaries: ONLY the directories in the documented tree. No code, no
dependencies installed, no README content beyond placeholders.

Verify: find . -type d -not -path '*/.git*' -not -path '*/.workflows*' | sort
        → matches the documented tree exactly`
```

Reviewer verdict gates it like any task (verdict gating applies — but for
a scaffold, a quick `git status` + tree-match check suffices; docs-tier).

## Phase 5: WIRE — charter, context, README skeleton, handoff

1. **Charter**: copy `templates/AGENTS.md` (package: two dirs up from
   this skill) to the project root. Every session — orchestrator and all
   subagents — auto-loads it from here on. If the project adds its own
   sections (test commands, conventions), follow the AGENTS.md authoring
   rules in `templates/DOCS-POLICY.md`: binding rules + one-liner facts
   + pointers to detail docs (e.g. `Test: npm test` · `Tests detail:
   tests/README.md`) — never command inventories; nested AGENTS.md files
   don't auto-load (pi walks up from cwd only).
2. **CONTEXT.md**: seed `.workflows/CONTEXT.md` from Phase 1-2 decisions
   (glossary terms + decisions; ADRs already written in Phase 2).
3. **README skeleton**: create per `templates/DOCS-POLICY.md` — title,
   one-paragraph description, install/build/test placeholders. (Full docs
   come from `/docs` when there's something real to document.)
4. Append to `.workflows/LOG.md`: `<date> INIT — architecture + tree approved, scaffolded`
5. **Hand off**: present the summary and point at `/plan` — its contract
   Boundaries now derive from the documented tree (say so explicitly in
   the handoff).

## Rules

- `/init` never implements features — architecture, tree, stubs only
- The tree is an APPROVED artifact, not a side effect of the first task
- `/init` on an existing project = `/audit` first (map what exists), then
  design gaps — never re-scaffold over live code
- Everything stays lean: this skill routes details to references
  (`agents/dispatch-shapes.md`, `templates/DOCS-POLICY.md`, the /docs
  skill's architecture template) instead of restating them
