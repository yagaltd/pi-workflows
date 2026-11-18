# Proposal — Plan 078: the judge seam everywhere (command-by-command adoption)

> Status: QUEUED 2026-11-18 (owner: "just occured to me that typellm can help when /restart or init on brownfield to speed things up and verify agent works") — executes after plan 077 lands (serialized; the seam and harness are 077's T1/T-harness) · Repo: pi-workflows
> Source: owner exchange 2026-11-18 + the command×capability audit (only /review and /ship have judge integration today)

## The principle

Every pi-workflows command's judgment / routing / extraction / verification calls ride **ONE JudgeBackend seam** (076's landed design): schema-driven, loud-skip (no key → the agent does it, surfaced), confidence-gated, never closing alone, env-side key. Per-command schemas; one key resolution; one harness pattern.

## The four gaps (tasks)

### Task 1 — consolidate the 073 sieve onto the seam
The proposal-entry sieve (plan 073, forced-choice triage) predates the seam and runs its own transport. Refactor it to consume JudgeBackend (same key order, same loud-skip, same confidence floor); its fixtures move into the shared harness. One backend everywhere; behavior identical.

### Task 2 — /init --adopt brownfield extraction draft
Brownfield /init is analysis-heavy. TypeLLM batch-extracts the FIRST DRAFT in one call: profile fields from build manifests (commands), tree domains, stack detection (drives the charter's domain-skill citation), charter pointer targets. Then the deterministic lints verify every path (profile-lint: every pointer/tree path exists; agents-lint; check-tree) — **draft-by-judge, verify-by-gate**. The judge never writes final config; lint failure blocks exactly as today. Also: boolean gate-questions sanity-check the draft ("test command present", "no key material in charter").

### Task 3 — /plan-time DAG extraction
TypeLLM decompose extracts task `Depends On` edges from plan text BEFORE spec drafting; plan-check validates the edges after (extraction before, validation after — the settled pattern). Position-bias controlled. The /plan flow renders the extracted edges for the owner to confirm; wrong edges are a finding, not silent acceptance.

### Task 4 — /audit batch verdicts
The audit checklist becomes many typed questions over one codebase batch (boolean gate-questions + enum severities + number evidence counts, 32k/128k window): findings pre-verified by the judge, the human receives the verified digest; uncertain rows stay for the agent. Audit output schema unchanged.

## Standing constraints

Same as 077: schema-driven, loud-skip, confidence-gated, never closes alone, env-side key, no README key material. Each task lands with fixture-harness modes + accuracy reporting (the Phase-1 pattern).

## Rollout

Task 1 first (consolidation — everything else then rides one implementation), then Task 2 (the owner's brownfield speed-up), then 3, then 4.

## Risks / open questions

- The 073 sieve refactor must keep its entry-gate behavior byte-identical (its pins/fixtures are the net).
- /init --adopt draft quality varies by repo messiness: the lints are the floor (a bad draft fails loudly at lint — acceptable; it still saves the reading time).
- Cost: batched calls keep this at a few cents per command run (usage accounting from the native surface, plan 077 Task 1).
