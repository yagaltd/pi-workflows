# Plan: dispatcher colon-placement tolerance + plan bullet grammar pin (20261104-062)

> Plan ID: 20261104-062
> Status: DONE — shipped as v0.14.19 on 2026-11-05; retro-archived 2026-11-17 by plan 20261117-064 (TASK 2)
> Created: 2026-11-05
> Reconstructed: 2026-11-17 — the original plan text is lost (see below)

## Reconstruction note (read first)

**The original `.workflows/plan.md` text for this plan is lost.** Plans 055–063 shared the
single live plan file; each plan overwrote it, and every one of them shipped before the SHIP
archive step was in force — so no bundle was ever written.

Nothing in this file was invented after the fact. It carries the surviving sources verbatim:

- **CHANGELOG.md** — the shipped entry `v0.14.19: dispatcher colon-placement tolerance + plan bullet grammar pin` (CHANGELOG.md:8)
- **.workflows/LOG.md** — every line naming this plan id (LOG.md:339, LOG.md:340)
- **.workflows/reviews/plan-062.md** — the review verdict, copied into this bundle as `reviews/plan-062.md`
  and reproduced verbatim below

Unrecoverable by construction, and therefore absent rather than guessed: the task decomposition,
the `specs/` contracts, the Execution Notes, and the per-task verdicts — all of them lived in the
overwritten plan file and its spec dir.

## CHANGELOG entry (verbatim)

```
## 2026-11-05 — v0.14.19: dispatcher colon-placement tolerance + plan bullet grammar pin (plan 20261104-062)

- `dispatch_next` now parses task bullets with the colon either side of the bold (`- **Label:** value` and `- **Label**: value`) via a `parseTaskBullets` seam — hand-authored brownfield plans (the visual-agent-frontend trial) no longer yield empty allowed/verify. Canonical-form regression golden-locked; bare-text bullets stay unparsed.
- **templates/CONTRACT-FORMAT.md** gains its first plan.md-side pin: the TASK bullet grammar `- **Label**: value` (canonical), tolerated forms noted; plan SKILL references it; 4 T12 doctrine pins + 3 parser unit tests.
- DEC-002 advisory resolved no-action (tolerance ≠ contract shape change). Suite 385 pass / 0 fail. Verdict reviews/plan-062.md ok:true.
```

## LOG lines (verbatim)

```
- 20261104 plan 20261104-062 APPROVED (owner "plan it"): dispatcher colon-placement tolerance — parse both `**Label:**` and `**Label**:` (visual-agent-frontend trial: hand-authored plan used colon-inside, dispatch returned empty allowed/verify); CONTRACT-FORMAT + plan skill pin canonical `- **Label**: value`; pins T12 + new tests/dispatch-parse.test.ts. Root cause verified: zero canonical-form matches in the trial plan; template never pinned placement; flow-run emitter stays canonical.
- 20261105 plan 062 CLOSED: verdict ok:true (reviews/plan-062.md, Tier A inline); SHIP v0.14.19. parseTaskBullets seam accepts both colon placements; CONTRACT-FORMAT gains plan bullet grammar pin; DEC-002 supersede advisory resolved no-action at the gate (tolerance ≠ shape change). Source: visual-agent-frontend /auto-next trial.
```

## Review verdict (verbatim)

```
# Review — plan 20261104-062 (dispatcher colon-placement tolerance + grammar pin)

- Verdict: **ok: true** (orchestrator-inline, Tier A — worker TDD RED→GREEN, merged e911177)
- Worker: pw64-colon-tolerance (run_mw3dqcxq_aggf4r/task_1); surgical +19/−10
- Verified on main post-merge: suite **385 pass / 0 fail** (3 dispatch-parse tests + 4 T12 pins added); drift CLEAN; docs-lint 12 gates CLEAN (README untouched — gen-docs in sync)
- T1: parseTaskBullets seam (regex accepts colon inside OR outside bold), parsePlan consumes it; canonical-form golden regression identical; bare-text bullets stay unparsed; CONTRACT-FORMAT.md gains the plan TASK bullet grammar section (first plan.md-side pin); plan SKILL references it
- Advisory resolution (raised at gate per instruction): [pi-workflows supersede] adr-contract-file/DEC-xxx — **no-action**. DEC-002 "Flows compile onto resolveNext" (scope scripts/flow-*.mjs, revisit-when dispatcher contract changes shape) is NOT superseded: plan-062 widened resolveNext's input tolerance, changed no scheduler structure; flows still render house plan text and dispatch through the one resolveNext. DEC-002 stands active.
- Root cause (source trial): visual-agent-frontend hand-authored plan used `- **Allowed:**` exclusively; parser was strict canonical-only → empty allowed/verify. Grammar now pinned in CONTRACT-FORMAT (first plan.md-side pin) + plan SKILL + T12.
```

## Docs impact

Reconstructed at retro-archive time — the original declaration was lost with the plan text. These are the doc paths the surviving evidence shows this ship updated.

- `CHANGELOG.md` — the v0.14.19 entry above, appended at SHIP.
- `templates/CONTRACT-FORMAT.md` — gains the plan TASK bullet grammar pin named in the entry.
