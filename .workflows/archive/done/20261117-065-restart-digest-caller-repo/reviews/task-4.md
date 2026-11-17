# Review — task-4

## Round 1 — 20261117 · reviewer

- Verdict: **ok: false**
- Findings: [P2] the dead binary survived in a surface directory —
  `templates/FOLLOW-UP-TABLE.md:42`, a historical worked-example row (pre-existing on base,
  outside the worker's Allowed Changes). Everything else green: spec 5/5, guard clean, full suite
  0 fail, drift CLEAN, DEC-003 amended with the accepted risk, pins load-bearing (6 of 10 fail
  against base 38e1188).
- Orchestrator action: annotated the row retired, then re-reviewed standalone against the
  worker's worktree instead of merging first.

## Round 2 (re-review) — 20261117 · reviewer (max)

- Verdict: **ok: false**
- Findings: [P2] the annotation itself changed an out-of-Allowed path (`templates/FOLLOW-UP-TABLE.md`
  not in the spec) AND contained the dead token twice, so the grep criterion was unmet. Both were
  orchestrator edits, correctly rejected.
- Orchestrator action: added the path to the spec's Allowed Changes (not waived) and reworded the
  row to "Retired test-quality tool", naming DEC-003 instead of the literal.

## Round 3 (re-review #2) — 20261117 · reviewer (max)

- Verdict: **ok: true**
- Landing verified: both worktrees at 37eb8df / tree 77d6b078.
- Boundary closed: `agent-spec lifecycle task-4.spec --change templates/FOLLOW-UP-TABLE.md` → exit 0,
  6/6 incl. `[boundaries] explicit change set respects declared paths`; negative control
  `--change README.md` → exit 1.
- Grep closed: `grep -rn 'tdd-gate' agents extensions scripts skills templates` → 0 matches.
- Substance: full suite 0 fail; drift CLEAN; `decisions check` CLEAN · 6; DEC-003 carries
  Amended-by 20261117-064, the accepted-risk paragraph and unchanged verdict semantics; the real
  chain present (68 tdd-guard hits); pins re-proved against base (6 failing).
- Notes for SHIP: `README.md:19` and `docs/architecture.md:22,482` still name the dead tool (spec
  reserves docs/README to SHIP); `agent-spec guard --change-scope worktree` is a **silent
  false-green inside subagent worktrees** because `.workflows/specs` is gitignored and absent —
  always pass the main-repo spec dir (or a staged temp dir).
