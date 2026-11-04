# Review — plan 20261104-058 (Ultimate surfaces: editable chat + dragology board)

- Verdict: **ok: true** (orchestrator-inline, Tier A — workers verified via strict tsc against the live clone SDK + mock-functional tests; orchestrator merged and placed all extensions in the running server's project root)
- Workers: pw61-editchat + pw61-piwboard (run_mw1ydxk5_0s8loa); piwboard merged 87c5c43; editchat authored in-place (main checkout) per live-discovery requirement
- Transport: .ultimate/extensions/{piw,piwboard,editchat}/ + settings.json — 13 files; vite compiles all three (tsconfig detection + full-reload in server log)
- editchat: hover ✎ on stored messages → LCS diff preview → Send-as-correction (harness().conversation().submit, followUp-queued) + Fork-with-edit (tx.forkConversation — SUPPORTED, proven from side-chat/lineage); mock-host tests green (fork user/assistant, no-harness fallback, 5 validation errors)
- piwboard: vendored dragology (320KB self-contained ESM, MIT-noted, react peers external); getBoard parses real plan-diagram output; sendBoardDiff structured JSON diff (move/relabel/add/remove + edge ops) all green in isolation
- Suite 343/0 in worker branches; main 352 pass / 0 fail post-merge of 057 line + these (no repo-core files touched); drift CLEAN
- KNOWN GATE (by design): project extensions load only after the OWNER accepts the project-setup trust decision in the Ultimate UI (ProjectTrustStore; server/extensions.ts setProjectDecision). Extensions compiled+registered-pending; final in-UI activation is the owner's consent click. Orchestrator deliberately does not bypass the consent gate.
- Trial fixes shipped separately in the Ultimate clone: chat width 46→60rem, tool cards max-h 80→36rem, transcript 64→28rem (upstream PR follow-up)
