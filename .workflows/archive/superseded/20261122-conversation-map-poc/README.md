# Archive — conversation-map TUI PoC (not merged)

> Status: ARCHIVED / SUPERSEDED · Date: 2026-11-22 · Owner decision: "nothing works the way I want — archive, clean up, do not merge."

This bundle preserves the complete brainstorm-to-PoC trail for the conversation/plan "subway map"
work. None of it was merged into master; master's tree is clean apart from this archive commit.

## What was tried (four stages)

| Stage | Run | Branch (deleted after archive) | Commit | Result |
|---|---|---|---|---|
| 1. Transcript → event cards | `run_mws012l9_h6spz4` | `subagents/run_mws012l9_h6spz4/task_1` | `ce1d772` | 115 cards from 133 entries — transcript with chips, not a map |
| 2. Decision cards | `run_mws0mzxn_9inw52` | `subagents/run_mws0mzxn_9inw52/task_1` | `3834ba4` | 115 → 11 cards, but still session-level ("guard check", "RED confirmed") |
| 3. Plan-level manager view | `run_mws2qd3j_t9msmp` | `subagents/run_mws2qd3j_t9msmp/task_1` | `7761da9` | right altitude, but synthetic fixtures (invented Kani rows) |
| 4. Live-data validation + chip proof | `run_mws31s3r_6wckgw` | `subagents/run_mws31s3r_6wckgw/task_1` | `5cee811` | real plan 076 tree; pi-emphasis decoration proven; user rejected the direction |

## Why archived

- The user wants a manager view of **plan tasks, review layers, escalations, approvals and gates** —
  not a tool-call map, not a generic decision-card feed, not a TUI build.
- Even the final plan-level tree was not the desired interface: the user asked to archive rather than
  iterate again.
- Chips do not render in this long-lived host session (no `reply_style` section / no TUI transform);
  the decoration was proven only by calling pi-emphasis's own `decorate()` directly.

## What is preserved here

- `patches/final.patch` — the complete final `prototype/poc/` tree as a patch against master
  (`git apply patches/final.patch` from the repo root restores it; checked with `git apply --check`).
- `snapshots/final/` — the 17 final PoC files, readable without applying the patch.
- `snapshots/active-tree-additions.patch` — the two master-file edits made during the exploration
  (CONTEXT glossary + LOG EXPLORE line), reverted from the live tree.
- `snapshots/explore-knowledge.md` — `.workflows/knowledge/explore-20261120-conversation-map-tui.md`.
- `snapshots/explore-ledger.md` — `.workflows/research/conversation-map-tui/ledger.md`.

## Final real-data output (for the record)

```text
Plan 076 — 20261117-076: the review restructure with the judge tier (APPROVED) · ship v0.15.12+
├── P1 Phase 1: TypeLLM client module [[Done]]
│   └── Report measured triage accuracy [[Needs you]]
│       └── Phase 2 approved (A) [[Done]]
├── P2 Phase 2: Jev sieve verdicts at review completion [[Done]]
└── P3 Phase 3: Batched-DAG review judging, TypeLLM-only [[Done]]
```

Chip proof: all pills in VOCABULARY; ANSI fg/bg + Nerd caps U+E0B6/U+E0B4 present; literal `[[` absent
from decorated output. No Kani rows exist in the live proofs — none were fabricated.

## Restore

```sh
git apply .workflows/archive/superseded/20261122-conversation-map-poc/patches/final.patch
bun test prototype/poc
bun prototype/poc/cli.ts --sources .workflows
```

The four subagent worktrees and branches were removed after this archive was written. No merge was performed.
