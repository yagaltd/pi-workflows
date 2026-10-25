# Docs canon

This repository's documentation standard, adapted from lore-style documentation
engineering (origin note: EpicGames/lore doc-standards canon, adapted upstream by
agent-spec). It governs every Markdown file a human or agent reads in this repo.

## Doc types (Diátaxis mapping)

| Location | Type | Purpose |
|---|---|---|
| `README.md` | reference entry | Install, commands, gates — the human entry surface |
| `AGENTS.md` | charter | Binding rules for every agent session; on conflict, this file wins |
| `skills/**`, `prompts/**` | how-to (procedures) | Step-by-step flows the orchestrator and roles follow |
| `agents/**` | procedures (verbatim prompts) | Role bodies — substituted verbatim at dispatch |
| `docs/**` | reference + explanation | Development guides, architecture, decision context |
| `docs/adr/**` | decision records | One ADR per architectural decision |
| `.workflows/archive/**` | decision records | Closed plans: the durable trace of what shipped and why |
| `.workflows/specs/**` | executable contracts | Per-task contracts (ephemeral until archived) |

## Rules

1. **One purpose per doc.** A how-to does not explain architecture; a reference
   does not narrate decisions. Split instead of stack.
2. **Generated docs carry stamps**: `generated_by` + `generated_at` + `stale_after`
   (+30d default). Expired stamps are drift (doc-drift gate, backlog item 4).
3. **Adopted ideas use our names.** Origin tools appear only as reference notes —
   e.g. "docs-lint — origin: agent-spec docs-lint, adapted from EpicGames/lore".
4. **Every behavioral claim names its gate.** If a sentence says an agent must or
   must not do X, the same doc (or its doc-policy entry) names the check that
   proves it — a command, a grep, or a verdict file.
5. **Machine truth and human prose live apart.** `.workflows/specs` + `@cc` carry
   machine-checkable truth; `docs/` carries reader-facing prose. Never duplicate
   one in the other.
