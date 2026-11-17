# Plan: Ultimate surfaces (20261104-058)

> Plan ID: 20261104-058
> Status: DONE — shipped as v0.14.14 on 2026-11-04; retro-archived 2026-11-17 by plan 20261117-064 (TASK 2)
> Created: 2026-11-04
> Reconstructed: 2026-11-17 — the original plan text is lost (see below)

## Reconstruction note (read first)

**The original `.workflows/plan.md` text for this plan is lost.** Plans 055–063 shared the
single live plan file; each plan overwrote it, and every one of them shipped before the SHIP
archive step was in force — so no bundle was ever written.

Nothing in this file was invented after the fact. It carries the surviving sources verbatim:

- **CHANGELOG.md** — the shipped entry `v0.14.14: Ultimate surfaces` (CHANGELOG.md:37)
- **.workflows/LOG.md** — every line naming this plan id (LOG.md:330, LOG.md:331, LOG.md:334)
- **.workflows/reviews/plan-058.md** — the review verdict, copied into this bundle as `reviews/plan-058.md`
  and reproduced verbatim below

Unrecoverable by construction, and therefore absent rather than guessed: the task decomposition,
the `specs/` contracts, the Execution Notes, and the per-task verdicts — all of them lived in the
overwritten plan file and its spec dir.

## CHANGELOG entry (verbatim)

```
## 2026-11-04 — v0.14.14: Ultimate surfaces (plan 20261104-058)

- pi-workflows now ships a committed `.ultimate/` package for [Ultimate](https://github.com/HazAT/ultimate) (pi in a web UI): **editchat** — hover ✎ on any stored message, edit with live LCS diff preview, send as correction (durable submit) or fork-at-entry carrying the edit; **piwboard** — dragology board (vendored, MIT) rendering `scripts/plan-diagram.mjs` output, drag/edit nodes, send the structured board-state diff to the agent; **piw** — orchestration action scaffold.
- Project extensions load after the one-time owner consent in Ultimate's Extensions panel (ProjectTrustStore — by design; never bypassed).
- Trial patches in the Ultimate clone: chat width 60rem, taller tool cards. Upstream PRs follow-up. Suite 352 pass / 0 fail; verdict reviews/plan-058.md ok:true.
```

## LOG lines (verbatim)

```
- 20261104 plan 20261104-058 APPROVED (owner "go"): Ultimate surfaces — T1 skeleton (inline), T2 editable-chat (worker high), T3 dragology board (worker high), T4 width/card patches (inline, ultimate clone). Trial facts pinned in plan.md. Server live on 4747 with project=pi-workflows.
- 20261104 plan 058 CLOSED: verdict ok:true (reviews/plan-058.md, Tier A inline); SHIP v0.14.14. .ultimate/ committed (piw/piwboard/editchat + settings). Owner-consent gate documented (ProjectTrustStore) — activation click belongs to Aurel. Ultimate clone trial patches: width 60rem, card heights 36rem/28rem. Discovery lesson pinned: new project-extension folders need server restart to register (HMR insufficient); actions POST requires browser origin.
- 20261104 plan 058 surfaces WITHDRAWN per owner trial: Ultimate tried, not satisfactory — .ultimate/ removed (piw/piwboard/editchat), v0.14.16. Clone + local patches untouched (machine-level). Validated assets kept: diagram generators, ideas ledger. Lesson: UX bar not cleared; agent-layer exploration moves to research (microOS proposal-005 ACP bus).
```

## Review verdict (verbatim)

```
# Review — plan 20261104-058 (Ultimate surfaces: editable chat + dragology board)

- Verdict: **ok: true** (orchestrator-inline, Tier A — workers verified via strict tsc against the live clone SDK + mock-functional tests; orchestrator merged and placed all extensions in the running server's project root)
- Workers: pw61-editchat + pw61-piwboard (run_mw1ydxk5_0s8loa); piwboard merged 87c5c43; editchat authored in-place (main checkout) per live-discovery requirement
- Transport: .ultimate/extensions/{piw,piwboard,editchat}/ + settings.json — 13 files; vite compiles all three (tsconfig detection + full-reload in server log)
- editchat: hover ✎ on stored messages → LCS diff preview → Send-as-correction (harness().conversation().submit, followUp-queued) + Fork-with-edit (tx.forkConversation — SUPPORTED, proven from side-chat/lineage); mock-host tests green (fork user/assistant, no-harness fallback, 5 validation errors)
- piwboard: vendored dragology (320KB self-contained ESM, MIT-noted, react peers external); getBoard parses real plan-diagram output; sendBoardDiff structured JSON diff (move/relabel/add/remove + edge ops) all green in isolation
- Suite 343/0 in worker branches; main 352 pass / 0 fail post-merge of 057 line + these (no repo-core files touched); drift CLEAN
- KNOWN GATE (by design): project extensions load only after the OWNER accepts the project-setup trust decision in the Ultimate UI (ProjectTrustStore; server/extensions.ts setProjectDecision). Extensions compiled+registered-pending; final in-UI activation is the owner's consent click. Orchestrator deliberately does not bypass the consent gate.
- Trial fixes shipped separately in the Ultimate clone: chat width 46→60rem, tool cards max-h 80→36rem, transcript 64→28rem (upstream PR follow-up)
```

## Docs impact

Reconstructed at retro-archive time — the original declaration was lost with the plan text. These are the doc paths the surviving evidence shows this ship updated.

- `CHANGELOG.md` — the v0.14.14 entry above, appended at SHIP.
