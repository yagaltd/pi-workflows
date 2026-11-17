# Plan: domain-skill wiring (20261104-063)

> Plan ID: 20261104-063
> Status: DONE — shipped as v0.14.20 on 2026-11-05; retro-archived 2026-11-17 by plan 20261117-064 (TASK 2)
> Created: 2026-11-05
> Reconstructed: 2026-11-17 — the original plan text is lost (see below)

## Reconstruction note (read first)

**The original `.workflows/plan.md` text for this plan is lost.** Plans 055–063 shared the
single live plan file; each plan overwrote it, and every one of them shipped before the SHIP
archive step was in force — so no bundle was ever written.

Nothing in this file was invented after the fact. It carries the surviving sources verbatim:

- **CHANGELOG.md** — the shipped entry `v0.14.20: domain-skill wiring` (CHANGELOG.md:1)
- **.workflows/LOG.md** — every line naming this plan id (LOG.md:341, LOG.md:342)
- **.workflows/reviews/plan-063.md** — the review verdict, copied into this bundle as `reviews/plan-063.md`
  and reproduced verbatim below

Unrecoverable by construction, and therefore absent rather than guessed: the task decomposition,
the `specs/` contracts, the Execution Notes, and the per-task verdicts — all of them lived in the
overwritten plan file and its spec dir.

## CHANGELOG entry (verbatim)

```
## 2026-11-05 — v0.14.20: domain-skill wiring (plan 20261104-063)

- **agents/reviewer.md**: the Domain-skills rule is now stack/area-general — consult the installed family matching the diff (Rust trio; **modern-web-guidance** + impeccable/audit for web/UI; **cloudflare workers + security audit** for CF code; **harden** for resilience), consulted-note duty kept (was Rust-only since v0.14.15).
- **/init**: the charter cites the DETECTED stack's installed family (greenfield pre-detection skips cleanly — the check lives right after the stack becomes known, not before).
- **/plan**: contracts carry an optional `- **Skills**:` line — workers are told the relevant domain skills explicitly.
- **/idea**: domain-skill consideration; capability gaps become ledger research items; `find-skills` stays owner-invoked (supply-chain consent); API services prefer MCP servers over skills.
- 4 T13 pins. Suite 389 pass / 0 fail. Verdict reviews/plan-063.md ok:true. Supersede advisory repeat-firing recorded as known false-positive class (DEC-002 no-action stands).
```

## LOG lines (verbatim)

```
- 20261105 plan 20261104-063 APPROVED (owner "plan it"): domain-skill wiring — reviewer rule generalized Rust-only → stack/area-matched (modern-web-guidance, cloudflare workers + security audit, impeccable/audit, harden added); /init step 1 stack-detected family citation (greenfield skips); /plan contracts Skills: line; /idea gap-note (find-skills owner-invoked, API services → MCP). Pins T13. Explicitly out: automatic online discovery, MCP adoption.
- 20261105 plan 063 CLOSED: verdict ok:true (reviews/plan-063.md, Tier A inline); SHIP v0.14.20. Domain-skill wiring: reviewer stack/area-general rule; init stack-detected citation; plan Skills line; idea gap-note (find-skills owner-invoked, MCP for API services). Supersede advisory repeat-firing = known false-positive class (DEC-002 no-action stands).
```

## Review verdict (verbatim)

```
# Review — plan 20261104-063 (domain-skill wiring)

- Verdict: **ok: true** (orchestrator-inline, Tier A — worker TDD RED→GREEN, merged 14bf8f2)
- Worker: pw65-skill-wiring (run_mw3l32tj_5oau6y/task_1); additive, 5 allowed files
- Verified on main post-merge: suite **389 pass / 0 fail** (4 T13 pins; 389 tests / 45 files); drift CLEAN; docs-lint 12 gates CLEAN
- Landed: reviewer.md Domain-skills rule generalized (Rust trio + modern-web-guidance + impeccable/audit for web, cloudflare workers + security-audit, harden; consulted-note kept); /init step 1 stack-detected family citation (greenfield pre-detection skips cleanly); /plan contracts optional `- **Skills**:` line (grammar-compliant — worker caught the colon-outside nuance); /idea domain-skill consideration + capability-gaps→ledger + find-skills owner-invoked + MCP-over-skills for API services
- Advisory: [pi-workflows supersede] adr-contract-file/DEC-xxx fired AGAIN — repeat of the plan-062 gate finding (resolved no-action: DEC-002 stands). Class recorded as known false-positive: LOG entries mentioning contracts trigger the sieve. Next real supersession (agent-mailbox consolidation ADRs) will be handled at that gate with explicit SUPERSEDED-by marking.
- Deferred (standing): claim grammar, immutable-id lint, MCP adoption
```

## Docs impact

Reconstructed at retro-archive time — the original declaration was lost with the plan text. These are the doc paths the surviving evidence shows this ship updated.

- `CHANGELOG.md` — the v0.14.20 entry above, appended at SHIP.
