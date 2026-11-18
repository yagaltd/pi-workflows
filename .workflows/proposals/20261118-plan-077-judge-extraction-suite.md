# Proposal — Plan 077: the judge-extraction suite (TypeLLM across pi-workflows' paper layers)

> Status: QUEUED 2026-11-18 (owner: "yes queue all of them") — executes after plan 076 Phase 3 lands (serialized suites, Resources doctrine) · Repo: pi-workflows · Depends on: 076's JudgeBackend seam + harness (landed) + Phase 3 batched-DAG (running)
> Origin: owner exchange 2026-11-18 — "typellm could help us save agent tokens, judgment, routing, verification, extraction… something else you see in the typellm api" + the report-normalization refinement (reports are for the orchestrator, not the owner; claims must be verified against session turns)

## The five rows

### Row 1 — LOG → knowledge mining
TypeLLM structured pull compiles the accreting `.workflows/LOG.md` into knowledge-promotion candidates (the 073 rule, machine-fed): periodic scan → candidate rows → the existing sieve judges → promoted or dropped. Kills the accretion disease at the root.

### Row 2 — incident → doctrine candidate
When an incident adds a rule, the incident itself extracts that rule as a **structured sieve candidate** (schema: rule, trigger, gate binding) → judged → pinned via the normal promotion path. Rules enter as DATA, never as prose accretion — the meta-cure for the 73-checks disease.

### Row 3 — worker-pack context extraction
TypeLLM pulls the **minimal per-task brief** from long brownfield plans/docs (32k window, chunked) — dispatch packs carry the extracted slice instead of full documents. Direct worker-token savings on every dispatch; contracts stay the primary context mechanism (extraction augments, never replaces).

### Row 4 — spec-draft extraction
Plan text → draft `.spec` scenarios (agent-spec authoring): TypeLLM extraction produces the contract skeleton (scenarios, steps, selectors) for owner review before `agent-spec init`. Feeds agent-spec's authoring step; the spec language stays unchanged.

### Row 5 — worker-report normalization + CLAIM VERIFICATION (the owner's refinement — the important one)
Worker reports are for the orchestrator, not the owner, and are too verbose. The new contract:

1. **Extract**: TypeLLM pulls the report's factual claims into a structured list (claim, type, session-turn pointer).
2. **Verify**: each claim is checked against the worker's **session turns** (the transcript is the ground truth) — TRUE / FALSE / UNVERIFIABLE per claim.
3. **Route**: verified-true claims pass to the orchestrator as a **compact verified digest** (the report becomes: digest + evidence pointers, not prose); any FALSE or UNVERIFIABLE claim bounces to the **worker (fix the report) or reviewer (re-review the work)** — a lying or unprovable report is a finding (the 068 discipline: queueing-is-a-finding extends to claiming-is-a-finding).
4. The owner-facing output loses the verbosity permanently; the full report stays in the session file as the evidence of record.

## Standing constraints (every row)

Schema-driven · loud-skip (no key/error → the agent does the work, surfaced) · confidence-gated (<0.6 → the deterministic path) · never closing alone (extraction and judgment candidates feed deterministic gates, the sieve, or the reviewer) · `TYPELLM_API_KEY` env-side (074 pin).

## Suggested rollout

Row 5 first (the owner's pain, the clearest contract) → Rows 1+2 together (shared mining machinery) → Rows 3+4 (extraction pair). Each row lands with its own fixture harness mode (the Phase-1 pattern) and reports accuracy before the next.

## Risks / open questions

- Session-turn pointers need a stable addressing scheme (entry index — session files are JSONL with stable order).
- Claim verification costs calls: batch claims per report (one call, N claims) — the Phase-3 batching pattern.
- Row 3 must not replace contracts as context (augment-only) — enforcement via the harness (compare worker success with/without).
- Hallucinated turn pointers: the verifier must treat a wrong pointer as FALSE (pointer accuracy is part of the claim).
