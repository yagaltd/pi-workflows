---
name: init
description: "Bootstrap a project: architecture design, folder tree, charter, docs skeleton — before any planning or building. Use for 'init project', 'set up this project', 'scaffold', 'new project setup', or when starting work on an empty/new repo."
user-invocable: true
argument-hint: "<project description>"
---

# Init Workflow — project bootstrap

`/init` is the step BEFORE `/idea`/`/plan`: it designs the structure the
contracts will later enforce. Nothing here builds features — it produces
an approved architecture, an approved folder tree, the charter, the
project profile, and doc skeletons, then hands off to `/plan`.

```
Phase 1 DECIDE  → stack/domain decisions (grill protocol)
Phase 2 DESIGN  → architecture: modules, boundaries, data flow, ADRs
Phase 3 TREE    → folder tree proposal → approval → architecture.md seeded
Phase 4 SCAFFOLD→ worker task: dirs + stubs per the approved tree
Phase 5 WIRE    → charter + profile + CONTEXT.md + README skeleton → /plan
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

## Phase 5: WIRE — charter, profile, context, README skeleton, handoff

1. **Charter**: GENERATE the project's AGENTS.md — copy
   `templates/AGENTS.md` (package: two dirs up from this skill) to the
   project root, fill the `<placeholder>` pointer slots from the Phase
   1–4 facts (project overview, test command, architecture/map + ADR
   targets, conventions doc), and write the project's own binding rules
   into the PROJECT block. Follow the AGENTS.md authoring rules in
   `templates/DOCS-POLICY.md`: binding rules + one-liner facts +
   pointers to detail docs (e.g. `Test: npm test` · `Tests detail:
   tests/README.md`) — never command inventories; nested AGENTS.md files
   don't auto-load (pi walks up from cwd only). Then RUN
   `bash scripts/agents-lint.sh AGENTS.md` — a lint failure BLOCKS the
   handoff: fix before presenting. For Rust projects, the charter's review
   pointers cite the Rust skill family (rust-review, rust-best-practices,
   unsafe-checker). Every session — orchestrator and all
   subagents — auto-loads it from here on.
2. **Profile**: GENERATE `.workflows/profile.json` — the machine truth
   for project facts: `commands`, `pointers`, `tree`, `gates`,
   `scaffolds`, `meta` (the schema is what `scripts/profile-lint.sh`
   checks). Greenfield: fill from the Phase 1–4 facts — test/lint/build
   commands (Phase 1), the pointer targets the charter cites (canon,
   docs-policy, registry, ADR index), tree domains from the approved
   Phase 3 tree, gates in run order (at minimum the charter's
   `scripts/agents-lint.sh`). Brownfield (`/init --adopt`): there are no
   interview facts — DERIVE the draft: read the build manifests
   (`Cargo.toml`, `package.json`, `pyproject.toml`) for test/lint/build
   commands, list the top-level dirs as tree-domain candidates, pick
   pointer targets that exist on disk — then PRESENT the draft to the
   owner for correction BEFORE linting. Then RUN
   `bash scripts/profile-lint.sh .workflows/profile.json` — a lint
   failure BLOCKS the handoff: fix before presenting (every pointer and
   tree path must exist on disk; a fictional path is a bug).
3. **CONTEXT.md**: seed `.workflows/CONTEXT.md` from Phase 1-2 decisions
   (glossary terms + decisions; ADRs already written in Phase 2).
4. **README skeleton**: create per `templates/DOCS-POLICY.md` — title,
   one-paragraph description, install/build/test placeholders. (Full docs
   come from `/docs` when there's something real to document.)
5. Append to `.workflows/LOG.md`: `<date> INIT — architecture + tree approved, scaffolded, profile linted`
6. **Charter probe**: VERIFY the scaffold finished — `test -f AGENTS.md` at the
   project root. If missing, FAIL LOUDLY: name the missing path
   (`AGENTS.md at <project root>`) and the remediation — run the charter step
   (Phase 5 step 1: copy `templates/AGENTS.md` and fill the slots), see
   `templates/DOCS-POLICY.md` / `docs/canon.md`. This probe is BLOCKING:
   init cannot proceed past it without AGENTS.md, and the remediation is
   mandatory, not advisory. Do NOT hand off without a charter: downstream
   roles and lints depend on it.
7. **Dev environment (mise)**: DETECT the stack from build markers
   (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`,
   `*.csproj`) and existing version files (`.nvmrc`, `.python-version`,
   `.tool-versions`, `mise.toml`). Greenfield: GENERATE a `mise.toml`
   draft — a `[tools]` block pinned from the detected markers, versions
   confirmed with `mise current` — then 🛑 GATE: the OWNER approves the
   draft before anything is written. Brownfield: mise already reads
   `.nvmrc` / `.python-version` / `.tool-versions` natively as-is —
   REPORT the native pinning and OFFER consolidation into `mise.toml`
   (never forced). On approval: run `mise install`, then verify each
   runtime resolves with `mise exec -- <runtime> --version`. Boundaries:
   NEVER delete existing version files; NEVER upgrade runtimes just to
   enable mise; NEVER silently replace another tool manager. mise
   missing → SKIP LOUDLY: REPORT it, OFFER installation
   (`curl https://mise.run | sh`), then continue Phase 5 without a
   `mise.toml` — init never blocks on mise, and the phase never aborts.
   Report the mise-absent skip loudly in the handoff.
8. **Model policy**: QUERY the LIVE pi model catalog (subagent_models tool
   surface — capability metadata only) and build the per-tier shortlist
   (strong/standard/scout/vision), preferring native provider models and
   noting provenance for each pick. 🛑 GATE: present the shortlist to the
   OWNER and record their pick, then write `models/registry.json` with
   provenance `pi-catalog`. The catalog is CAPABILITY truth: NEVER read
   key files or key contents (API keys) — the catalog needs no secrets.
9. **Hand off**: present the summary — including BOTH the model-policy
   outcome (the owner's registry picks and their provenance) AND the
   dev-environment outcome (mise.toml written and verified, native
   pinning reported, or the loud mise-absent skip) — and point at `/plan` — its contract
   Boundaries now derive from the documented tree (say so explicitly in
   the handoff). The fresh project now carries its charter (probed
   in step 6), its `.workflows/profile.json`, CONTEXT.md, and the README
   skeleton — and
   any later session can `/resume` (it runs `bash scripts/resume-digest.sh`)
   to rebuild state before continuing.

## Rules

- `/init` never implements features — architecture, tree, stubs only
- The tree is an APPROVED artifact, not a side effect of the first task
- `/init` on an existing project = `/audit` first (map what exists), then
  design gaps — never re-scaffold over live code
- Everything stays lean: this skill routes details to references
  (`agents/dispatch-shapes.md`, `templates/DOCS-POLICY.md`, the /docs
  skill's architecture template) instead of restating them
