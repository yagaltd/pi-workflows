# How should pi render a live "subway map" of the conversation — divergence, pending work, implementation additions — beside a scrollable detail pane, with formatting decisions made by typed-LLM judgment?

## 🎯 Scope
- IN: a pi extension (+ possible harness TUI mod) that visualizes the session tree as a vertical node/edge map in a 70-30 split; typed-judge (typellm) deciding answer formatting before display; click-a-node → detail pane scrolls to that turn.
- OUT: web/GUI frontends, changing what the model outputs (formatting is display-layer only), multi-session dashboards (single active session first).
- Decision owner: Aurel · Started: 2026-11-20

## 💡 Branches

### ✅ B1 — typellm decides per-answer format before render
- Status: ✅ settled 2026-11-20 — [explore] flash-class ~100-token typed call ≈0.7–1.1s p50 → acceptable ONLY async-on-settle; pattern = settle-judge cascade (heuristic → classify() on uncertain), cache (entryId,textHash,rubricVersion). pi's codemode `models.classify()` is purpose-built.
- Evidence: judge infra exists and is proven (pi-workflows `scripts/judge.mjs ask`, typed schemas, sieve-on-seam 078) — a per-turn call with a small schema (format: prose|table|list|map-node, collapse: bool, headline: string) is mechanically trivial.
- Implication: cost/latency per assistant turn (~1 short typed call, flash-class model) — acceptable IF batched with the existing post-turn seam instead of a second round-trip.
- Settled by: a latency/cost measurement on 10 real turns; fallback = deterministic heuristics (length/tool-call type) with typellm only classifying "does this answer deserve a map node".

### ✅ B2 — the data source already exists: the session JSONL is a tree
- Status: ✅ validated 2026-11-20 — inspected a subagent session file directly
- Evidence: pi session entries carry `parentSession` + `parentId` (branch lineage), `type: toolCall` with names (write/edit/bash), goal/plan state queryable. Divergence = branch points; "added during implementation" = write/edit toolCalls; "pending" = open plan tasks / active goal / unfinished gates.
- Implication: no model call needed to BUILD the graph — only to LABEL/compress it (B1 judges what a node says, not what exists).
- Settled by: — (closed; build the extractor first, deterministic, like evasion-scan)

### ✅ B3 — rendering depth: three candidate integrations
- Status: ✅ settled 2026-11-20 — [explore] D1/D2 extension-only today (setWidget live strip + nonCapturing overlay; entry renderers static — don't use). D3 (70-30 split) = ~20-line fork of chat-viewport.ts/createChatViewport() (HStack wrap); clean click-to-scroll = 5-line upstreamable transcriptScrollView exposure. Live-update via getTree()+tail (<50ms rebuild, 100ms debounce).
- Evidence (pi 1.6 docs): extensions get `MouseRegion` (click regions), `ScrollView`, custom components (`@earendil-works/pi-tui`), `ctx.ui` overlays/dialogs, `registerEntryRenderer` (TUI-only transcript entries), markdown transformers. No first-class persistent split-pane API for extensions today.
  - D1 **overlay**: `/map` opens a full-screen clickable map overlay (ctx.ui) → pick node → closes and jumps/scrolls. Cheapest, works today.
  - D2 **inline live entries**: a TUI-only entry re-rendered after each turn, embedding a compact map (ASCII/box-drawing subway strip). Clickable via MouseRegion; scrolls with the transcript.
  - D3 **persistent 70-30 split**: a real side region beside the transcript. Likely needs a harness-level TUI mod (pi's own layout), not just the extension API. Highest polish, highest cost.
- Implication: D1+D2 are extension-only and composable; D3 is a pi-coding-agent feature request or local fork.
- Settled by: prototype D2 inside one extension (~1 day); escalate to D3 only if the inline strip feels cramped.

### ❓ B4 — what "pending" and "added" mean across tool boundaries
- Status: ❓ open · since 2026-11-20
- Evidence: pi-workflows state is spread (plan tasks in .workflows/plan.md, goal via get_goal, gates, verdict files); a node's payload must merge session-tree facts (toolCalls) with harness facts (plan/goal state) — the merge rules are undecided.
- Implication: node taxonomy draft: 🞄 turn · ⑂ fork/branch · ✎ file edit · ⛭ gate/verdict · ○ pending task · ⬤ active goal. Subway metaphor: lines = threads (main / subagent), stations = turns, interchange = fork.
- Settled by: your call on the taxonomy + one real-session walkthrough.

### ✅ B5 — where it lives
- Status: ✅ settled 2026-11-20 — [explore] split confirmed: standalone pi extension (extractor + renderer + judge cascade); pi-workflows hosts only the node taxonomy + judge-prompt docs (V2/V3 harness additions upstreamable to pi).
- Evidence: pi extension = portable across your repos (no pi-workflows dependency for the core); pi-workflows = the right home only for the judge-format seam + node taxonomy conventions.
- Implication: split it — extension (renderer + extractor) standalone; typellm formatting prompts + taxonomy docs in pi-workflows.
- Settled by: your call at graduate time (/explore on B3-D2 → then /idea).

## Frontier (ranked)
1. B1 latency measurement (cheap, closes the typellm-vs-heuristic question)
2. B3-D2 prototype (the decisive feasibility test)
3. B4 taxonomy walkthrough on a real MorphNSH session

## Parked 💤
- ponytail-gain-style A/B agent benchmark (expensive, separate workstream)
- multi-session overview map

## Changelog
- 2026-11-20: ledger created from session; B2 closed by direct session-file inspection; B1/B3/B4/B5 opened.
- 2026-11-20: /explore complete (3 recon agents) — B1/B3/B5 settled; verdict PROCEED phased (V1 extension → V2 scroll exposure → V3 viewport fork). Knowledge: .workflows/knowledge/explore-20261120-conversation-map-tui.md. B4 (taxonomy walkthrough) remains for the PoC.
