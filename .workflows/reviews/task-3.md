# Task 3 — thin prompts rewrite (plan 20261026-036)

## Round 1 — FINAL — ok: TRUE (reviewer pw36-t3-reviewer)
- Layer 1: 6/6 contract Test commands exit 0 (dispatch_next in both prompts; zero bun -e; zero registry-map prose; zero record-step prose; 45/45 line bounds; auto-next budget + no-pending). parse/lint clean; lifecycle 6/6 Skip = docs-contract binding artifact (verbatim authoritative).
- Layer 1b: guard --spec single-file — zero violations; diff = {prompts/next.md (−58), prompts/auto-next.md (−44)} exactly.
- Layer 2: n/a. Layer 3: bun 212 pass / 13 fail in the worktree — attribution mechanically proven: 11 environmental (gitignored .workflows state absent in worktrees, identical at parent) + 2 stale-protocol tests (budget-wiring, proof-docs) that assert the DELETED prompt protocol — a P1 routed to the orchestrator (tests/** outside T3's Allowed by design).

## ORCHESTRATOR ADJUDICATION (post-merge)
- The 2 stale tests (plans 20261025-024/-025 era) assert the OLD protocol: record-step prose inside the prompts. Plan 036 D4 orders that prose deleted; the records are extension-owned (T2). Tests rewritten to the NEW protocol: prompts carry dispatch_next + stay silent about record scripts; the extension tests own the record behavior.
