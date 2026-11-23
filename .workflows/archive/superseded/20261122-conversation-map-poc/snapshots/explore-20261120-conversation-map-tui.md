# Exploration: Can pi render a live conversation "subway map" (70-30 split, clickable nodes, typellm-decided formatting)?
Date: 2026-11-20 · Verdict: **PROCEED (phased)** · Ledger: .workflows/research/conversation-map-tui/ledger.md

## Per-angle findings

### pi TUI capabilities (agent: recon-tui-capabilities, high)
- **Split pane: impossible via extension API today.** All extension surfaces are vertical dock slots (`setWidget` above/below editor — component factories uncapped, `setFooter`, `setStatus`; dist/modes/interactive/interactive-mode.js:2215-2266). The true 30% side pane needs a harness mod: fork `chat-viewport.ts` / `createChatViewport()` with an HStack wrap (~20 lines) — file+function identified.
- **Live update**: `registerEntryRenderer` entries are **static once appended** (officially); loophole = uncached render + captured `tui.requestRender()` (pi-tui dist/tui.js:106-118 renders every child every frame). Cleaner: `setWidget`/overlay components receive `tui`+`theme` directly and can re-render freely. Avoid `appendEntry`-per-update (writes session entries = transcript spam).
- **Click → scroll**: `MouseRegion` clicks work (press/release/click synthesis, tui-alt-screen.js:746-756); `{handled:true}` suppresses selection. No official scroll API — duck-typed hack: walk `tui.getMountedRoots()` → viewport.root Stack → ScrollView.scrollTo(line) (scroll-view.js:101-156); entry→line via deep-imported layout-node.js. **Clean path = a 5-line harness addition exposing `transcriptScrollView`** (upstreamable).
- **Session access: full.** `ctx.sessionManager` is ReadonlySessionManager: `getEntries()`, `getBranch(fromId?)`, **`getTree(): SessionTreeNode[]`** {entry, children, label, labelTimestamp} (session-manager.d.ts:131-138, 178, 318, 347) — purpose-built for the map. pi emits only `session_tree` (+ `session_start` on /new,/resume,/fork); `session_switch`/`session_branch` are OMP-host events (ponytail registers them defensively; they never fire in pi — pi-extension/index.js:212-215).
- **Modeless overlay possible** (nonCapturing, tui.d.ts:172-174) but floats *over* the transcript (occludes), not beside.

### Session data layer (agent: recon-session-datalayer, high)
- **JSONL**: line 1 = header {type:session, version:3, id, cwd, parentSession?}; every entry = {type, id(8-hex), parentId(8-hex|null), timestamp} + union payload (session-manager.d.ts:5-12, 128). Branching = parentId chains within file; child sessions get their own dir/file with `parentSession` abs-path. Real examples verified: ponytail-mode custom entries, compaction entries with parentId.
- **Pending detection** (deterministic): toolCall with no matching toolResult = hanging; `isError:true` = error edge; queue.json non-empty; plan task without journal `done`; LOG "awaiting approval|awaiting /review"; subagents task.status != completed.
- **Cost**: 3114-entry main session full re-parse ≈ **<50ms** (Node readline+JSON.parse, truncate long content at extract). Live = fs.watch + byte-offset tail (append-only → parse only new lines) + `session_tree` hooks trigger cheap parentId-map re-walk. **v1 needs no incremental index** — full rebuild with ~100ms debounce is viable.

### Prior art + latency (agent: recon-priorart-latency, high)
- **Provenance caveat**: that agent had no web/fetch tools — pi-specific facts verified on disk with citations; external prior-art from training knowledge, flagged [U] for re-verification.
- **No terminal subway-map library exists** — genuinely new surface. lazygit's two-pane graph+detail = the interaction metaphor [U]. LLM chat-tree viewers (LibreChat, ChatGPT tree explorers) prove demand but are web [U]. graph-easy/drawille/blessed-contrib = technique references, not drop-in [U].
- **Rendering**: pi-tui `string[]`-per-width components + HStack + setWidget/ui.custom = direct fit for box-drawn rails; the bundled doom-overlay example runs 35 FPS in an overlay → per-turn redraw cost trivial. Braille/sixel/kitty-gfx = v2+.
- **Latency** [U]: flash-class ~100-token typed-JSON call ≈ 0.7–1.1s p50 (TTFT 0.3–0.6s + 170–300 tok/s); gpt-mini ~1.0–1.4s; reasoning-mode minis 2–6s+ (avoid). Verdict: **acceptable per-turn iff async on turn settle** — placeholder then patch; cascade (deterministic heuristic → LLM only on uncertain); cache by (entryId, textHash, rubricVersion); settle-batch backfill; concurrency cap 2–4. **pi's codemode `models.classify()` (docs/codemode.md, verified) is a purpose-built cheap judge primitive for exactly this role.**

## Synthesis
- The 70-30 split is **not** an extension question — it's a ~20-line harness fork of `chat-viewport.ts`. Everything else (extractor, map component, clicks, live updates, judge labels) is extension-level today.
- The data layer is cheap and deterministic: `getTree()` + tailed JSONL, <50ms rebuild, pending detection fully mechanical — **typellm only labels nodes, never builds the graph** (confirms ledger B2).
- The judge seam (B1) is settled as **async-on-settle cascade**: heuristics first, `models.classify()`/flash-class typed call only when uncertain, placeholder-then-patch so display never blocks.
- Unknowns remaining: real-session walkthrough for the node taxonomy (B4); whether upstream pi would take the `transcriptScrollView` exposure + split-pane PR (V2/V3 maintenance question); prior-art URLs unverified.

## Recommendation
**PROCEED — phased so each phase stands alone:**
- **V1 (extension-only, no fork):** `/map` overlay (full clickable map; MouseRegion nodes; overlay/jump) + a compact live strip via `setWidget` (below editor, ~6-8 lines) fed by getTree()+tail with 100ms debounce. Judge: heuristic-first cascade with classify() for uncertain labels. ~2-3 days.
- **V2 (tiny harness addition):** expose `transcriptScrollView` (5 lines, upstreamable) → clean click-to-scroll. Hours.
- **V3 (the 70-30 split):** fork `chat-viewport.ts` HStack wrap (~20 lines) — local fork pinned to pi releases, or propose upstream. The flagship UX.

## If we proceed
- Scope: V1 ≈ 2-3 days (extractor + overlay + widget strip + judge cascade); V2 hours; V3 ~1 day + release-pinning maintenance.
- Key risks: unofficial surfaces (live-entry loophole, ScrollView duck-typing) break on pi updates → prefer official APIs + upstreamable additions; per-turn judge latency → async-on-settle is mandatory, never blocking; V3 fork maintenance cost.
- Suggested next: human approves → Phase 4 PoC of V1's overlay + extractor inside `prototype/poc/` on a real MorphNSH session (validates B4 taxonomy with real data).
