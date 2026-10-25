# Whole-plan quality gate — plan 20260919-010 (code-contracts durable rules layer)

- Gate: /review tier-2, whole-plan (1ad5d2d..HEAD)
- Round 1 (tqr, zai/glm-5.3): **ok:false** — 2× P1 seam breaks + 1× P2, all verified against cc-check 0.2.0's actual parser:
  - P1: agents/worker.md:100-103 taught an INVALID @cc form (`// @cc label:x id:y "prose"` line-comment — invisible to cc-check in TS)
  - P1: agents/reviewer.md skip condition keyed on a nonexistent "@cc/CONTRACTS directory" — the Layer 3 gate would skip every root-CONTRACTS repo, including ours
  - P2: extensions/index.ts:419/439 shell-interpolated filenames (backticks/$ survive JSON.stringify quoting; git-show path unquoted)
- Fix round 1 (75daa43, orchestrator-inline Tier A — 3 named edits): worker example → doc-comment real grammar (+ doc-comment-only rule); reviewer skip → "any @cc comments or a CONTRACTS file" per task-2 spec wording (body + output template); extension → runCapture(spawnSync arg arrays) for cc-check list + git show.
- Round 2 (tqr2, zai/glm-5.3): **ok:true** — all 3 findings resolved EMPIRICALLY (live `cc-check list` probe parsed the new example directives incl. adr:7; grep-zero proofs; call-site conversions verified). Regression: 53/0, cc-check format rc 0, drift CLEAN, diff exactly the 3 named files.
- Advisory note carried (non-blocking): reviewer.md:83 says format checks "no duplicate IDs" (from cc-check's own help text); tqr2's dup-probe passed rc=0 — wording softened or verified upstream later.

**Seam lesson**: 10/10 per-task gates passed; all three defects lived BETWEEN merges — the tier-2 whole-plan gate is where cross-merge contradictions surface.

## Verdict

**ok: true**
