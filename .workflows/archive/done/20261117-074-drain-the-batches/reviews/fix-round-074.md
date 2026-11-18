# Review + incident record — plan 074

## Task 1 (tdd-guard language batch) — reviewer tg74-t1 · ok: true (first pass)

- Independent /tmp reproductions of all classifications; selector probe proved
  the substring flip; scope exact; budgets/lock truthful.

## WORK-LOSS INCIDENT + RECOVERY (orchestrator-owned, 20261117)

- Cause: the T1 worker's diff was staged-UNCOMMITTED (harness auto-commit
  failed on the bare node_modules ignore — known interaction). The
  orchestrator merged blindly (an `Already up to date` result — the branch
  had no commits — and treated it as a result instead of a stop signal), then
  ran worktree cleanup with --force, destroying the worktree and its staged
  diff.
- Recovery: session replay — the worker's session jsonl stores every write/
  edit tool op with full payloads; a recursive walk recovered 10 ops (3
  writes + 7 multi-hunk edits), replayed on a fresh worktree. One literal
  duplication deduped (two edit calls carried the same new function); 37/37
  reproduced; the dangling commit rescued from the object store
  (`git branch recovery-t1 db9931f`) and merged as 685cba8.
- Registry rule added (v0.15.10): worker diffs are uncommitted until
  committed post-verdict; no cleanup with uncommitted worker work;
  `Already up to date` = stop signal; session replay is the recovery method
  of record.
- /tmp hygiene: 384 stale fixture dirs from repeated test runs removed.

## Task 2 (parser conditional-idiom unwrap) — reviewer tg74-t2 · ok: true (first pass)

- 11 phantom no-assertionless violations on the REAL pi-workflows suite → 0
  (reviewer reproduced the before/against delta personally); negative pin
  holds (empty bodies inside skipIf stay flagged by name); runtime version
  derivation confirmed (no literal in cli.ts; dist --version tracks
  package.json). Fix-round hygiene: 2 speculative @cc markers removed
  (subtract-first).
- 0.1.7 merged + pushed; global binary derives 0.1.7.

## Task 3 (agent-spec plan-check docs) — reviewer as74-t3 · ok: true (first pass)

- docs/plan-check.md verified line-by-line vs src/main.rs (zero
  contradictions); presence pin; merged as 15108c5 (no bump — docs+test-only).

## Ledger at v0.15.10

ONE [[Pending]] row: discovery rust-pattern widening from inside test dirs —
deferred(trigger: a non-cargo rust-shaped repo needs lint there). The
enabling tightening (word-anchored verify match) shipped in T1. Everything
else in the ledger is [[Done]].
