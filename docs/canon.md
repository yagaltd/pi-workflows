---
generated_by: pi-workflows plan lifecycle
generated_at: 2026-10-29
stale_after: 2026-11-28
---

# Docs canon

This repository's documentation standard, adapted from lore-style documentation
engineering (origin note: EpicGames/lore doc-standards canon, adapted upstream
by
agent-spec). It governs every Markdown file a human or agent reads in this repo.

## Doc types (Diátaxis mapping)

| Location | Type | Purpose |
| --- | --- | --- |
| `README.md` | reference entry | Install, commands, gates — entry surface |
| `AGENTS.md` | charter | Binding rules per session; wins on conflict |
| `skills/**`, `prompts/**` | how-to | Step-by-step flows agents follow |
| `agents/**` | procedures | Role bodies — substituted verbatim |
| `docs/**` | reference + explanation | Guides, architecture, decision context |
| `docs/adr/**` | decision records | One ADR per architectural decision |
| `.workflows/archive/**` | decision records | Closed plans, with rationale |
| `.workflows/decisions/**` | decision records | Standing `DEC-xxx` rulings |
| `.workflows/specs/**` | executable contracts | Per-task contracts, ephemeral |
| `.workflows/wip/**` | runtime batch state | WIP; not a new doc type |

## Rules

1. **One purpose per doc.** A how-to does not explain architecture; a reference
   does not narrate decisions. Split instead of stack.
2. **Generated docs carry stamps**: `generated_by` + `generated_at` + `stale_after`
   (+30d default). Expired stamps are drift (doc-drift gate, plan 20261025-018;
   gate: scripts/docs-lint.sh stamps section).
3. **Adopted ideas use our names.** Origin tools appear only as reference
   notes — e.g. "docs-lint — origin: agent-spec docs-lint, adapted from
   EpicGames/lore".
4. **Every behavioral claim names its gate** (gate: scripts/docs-lint.sh
   claim-to-gate scan, plan 20261025-018). If a sentence obligates an agent —
   do X, or avoid X — the same doc names the check that proves it: a command,
   a grep, or a verdict file.
5. **Machine truth and human prose live apart.** `.workflows/specs` +
   `@cc` carry
   machine-checkable truth; `docs/` carries reader-facing prose. Never duplicate
   one in the other.
6. **@cc is seam-only.** Place an `@cc` contract at a new seam when the code
   lands, or by drift — a caught invariant earns its contract. An `@cc` states
   the constraint in code-local terms and references its decision
   (`adr:DEC-xxx`) (gate: cc-check format, final gate chain). It never restates
   ADR rationale or spec criteria (gate: plan 20261025-012 record), and never
   arrives as a folder-tree or per-file sweep (gate: plan 20261026-039 records).
7. **Chat-reply decoration stays out.** Status pills and icon glyphs are for
   chat replies; every tracked Markdown file stays clean (gate:
   `templates/STATUS-VOCABULARY.md`, the rule of record).
8. The Rust structural gate is the proof for Rust claims: the generated
   `mise run check` chain runs the structural commands, and
   `rust-crate-architecture` settles crate-boundary decisions (gate:
   `tests/mise-tasks.test.ts`).
