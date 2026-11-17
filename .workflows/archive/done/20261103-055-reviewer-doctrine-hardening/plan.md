# Plan: reviewer doctrine hardening (20261103-055)

> Plan ID: 20261103-055
> Status: DONE — shipped as v0.14.11 on 2026-11-03; retro-archived 2026-11-17 by plan 20261117-064 (TASK 2)
> Created: 2026-11-03
> Reconstructed: 2026-11-17 — the original plan text is lost (see below)

## Reconstruction note (read first)

**The original `.workflows/plan.md` text for this plan is lost.** Plans 055–063 shared the
single live plan file; each plan overwrote it, and every one of them shipped before the SHIP
archive step was in force — so no bundle was ever written.

Nothing in this file was invented after the fact. It carries the surviving sources verbatim:

- **CHANGELOG.md** — the shipped entry `v0.14.11: reviewer doctrine hardening` (CHANGELOG.md:53)
- **.workflows/LOG.md** — every line naming this plan id (LOG.md:324, LOG.md:325)
- **.workflows/reviews/plan-055.md** — the review verdict, copied into this bundle as `reviews/plan-055.md`
  and reproduced verbatim below

Unrecoverable by construction, and therefore absent rather than guessed: the task decomposition,
the `specs/` contracts, the Execution Notes, and the per-task verdicts — all of them lived in the
overwritten plan file and its spec dir.

## CHANGELOG entry (verbatim)

```
## 2026-11-03 — v0.14.11: reviewer doctrine hardening (plan 20261103-055)

- **agents/reviewer.md** closes the verified charter gap: reviewers now read AGENTS.md at the verified root (the charter — Refactor first, Subtract first, Root causes — is the review lens, not optional context), carry both anti-over-engineering charter lines verbatim, and run a **subtract-first audit** on every review: "could this diff be smaller? Was existing structure extended instead of new surface added? An additive-only review that never asked is an incomplete review."
- Pinned by 4 new T7 tests (prompt-doctrine.test.ts); additive-only, all prior pins green. Suite 331 pass / 0 fail. Verdict reviews/plan-055.md ok:true (Tier A inline).
```

## LOG lines (verbatim)

```
- 20261103 plan 20261103-055 APPROVED (owner: "ok plan it and implement"): reviewer-side doctrine hardening — reviewer.md gains Read-AGENTS.md mandate + Refactor-first/Subtract-first charter lines + subtract-first audit checklist item; pinned by T7 describe. Micro-plan, Tier A inline verdict, ship v0.14.11. Closes the verified gap: reviewer.md had zero charter references and no over-engineering audit.
- 20261103 plan 055 CLOSED: verdict ok:true (reviews/plan-055.md, Tier A inline); SHIP v0.14.11 (owner-approved plan, standing push auth). Reviewers now carry the charter lens + subtract-first audit — the over-engineering gap is closed at the reviewer layer.
```

## Review verdict (verbatim)

```
# Review — plan 20261103-055 (reviewer-side doctrine hardening)

- Verdict: **ok: true** (orchestrator-inline, registry Tier A — docs-only micro-plan, worker TDD RED→GREEN)
- Worker: pw59-reviewer-hardening (run_mw0ydqf3_gy5ub0/task_1); merged 02db58b
- Transport verified on main: reviewer.md gains the Read-AGENTS.md mandate (review-lens phrasing), Refactor-first + Subtract-first charter lines verbatim, and the subtract-first audit item ("could this diff be smaller") in ## Rules; agents/ delta = reviewer.md only (+5 lines since v0.14.10 base, additive)
- Pins: T7 describe 4/4 green (mandate, both charter lines, audit item, placement); suite 331 pass / 0 fail; drift + docs-lint CLEAN; plan-050 Budget/Cite pins intact
- Closes the verified gap: reviewer.md previously had zero charter references and no over-engineering audit
```

## Docs impact

Reconstructed at retro-archive time — the original declaration was lost with the plan text. These are the doc paths the surviving evidence shows this ship updated.

- `CHANGELOG.md` — the v0.14.11 entry above, appended at SHIP.
