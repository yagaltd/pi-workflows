# Proposal — Plan 077: the judge-extraction suite (TypeLLM across pi-workflows' paper layers)

> Status: QUEUED 2026-11-18 (owner: "yes queue all of them") — executes after plan 076 Phase 3 lands (serialized suites, Resources doctrine) · Repo: pi-workflows · Depends on: 076's JudgeBackend seam + harness (landed) + Phase 3 batched-DAG (running)
> Origin: owner exchange 2026-11-18 — "typellm could help us save agent tokens, judgment, routing, verification, extraction… something else you see in the typellm api" + the report-normalization refinement (reports are for the orchestrator, not the owner; claims must be verified against session turns)

## Tasks (one plan, ordered, executed in sequence under the normal gates)

### Task 1 — native-surface upgrade (owner-verified from typellm.ai/docs/api; the transport every task rides)
The landed phases hand-rolled or under-used six native capabilities (verified docs):
1. **Nullable abstention**: `["verdict","null"]` output types — architectural
   no-answer instead of prompt-instructed uncertainty (the v08 confident-wrong
   residual's designed fix).
2. **`return_probabilities` + `levels` + `permutations`**: native probability
   distributions averaged over balanced option orders — DELETES our hand-rolled
   2-call permutation runs.
3. **`array` of objects** (minItems/maxItems ≤200): per-scenario verdicts as one
   array question — deletes the flat `{id}_verdict` key hack.
4. **128K-token context** (context + questions; we chunk at 32K): real multi-file
   diffs fit unchunked.
5. **`images`**: Base64 data URIs, ≤8/call ×10MB — E2E screenshot verdicts, visual
   review without a subagent.
6. **`thinking` + `thinking_budget`** ($0.50/M): reasoning on hard scenarios only.
   Plus: `"user"` questions (native stop-and-resume human-in-the-loop — the light
   Tier-2 escalation primitive) and `usage` token accounting (per-review cost).
   Scope: transport-level upgrades in extensions/index.ts §9c/§9; each with a
   fixture test (nullable → uncertain rows; probabilities present; array shape;
   128K unchunked 100KB diff; image call; usage surfaced). Jev stays dropped.



### Task 3 — LOG → knowledge mining
TypeLLM structured pull compiles the accreting `.workflows/LOG.md` into knowledge-promotion candidates (the 073 rule, machine-fed): periodic scan → candidate rows → the existing sieve judges → promoted or dropped. Kills the accretion disease at the root.

### Task 4 — incident → doctrine candidate
When an incident adds a rule, the incident itself extracts that rule as a **structured sieve candidate** (schema: rule, trigger, gate binding) → judged → pinned via the normal promotion path. Rules enter as DATA, never as prose accretion — the meta-cure for the 73-checks disease.

### Task 5 — worker-pack context extraction
TypeLLM pulls the **minimal per-task brief** from long brownfield plans/docs (32k window, chunked) — dispatch packs carry the extracted slice instead of full documents. Direct worker-token savings on every dispatch; contracts stay the primary context mechanism (extraction augments, never replaces).

### Task 6 — spec-draft extraction
Plan text → draft `.spec` scenarios (agent-spec authoring): TypeLLM extraction produces the contract skeleton (scenarios, steps, selectors) for owner review before `agent-spec init`. Feeds agent-spec's authoring step; the spec language stays unchanged.

### Task 2 — worker-report normalization + CLAIM VERIFICATION (the owner's refinement — the important one)
Worker reports are for the orchestrator, not the owner, and are too verbose. The new contract:

1. **Extract**: TypeLLM pulls the report's factual claims into a structured list (claim, type, session-turn pointer).
2. **Verify**: each claim is checked against the worker's **session turns** (the transcript is the ground truth) — TRUE / FALSE / UNVERIFIABLE per claim.
3. **Route**: verified-true claims pass to the orchestrator as a **compact verified digest** (the report becomes: digest + evidence pointers, not prose); any FALSE or UNVERIFIABLE claim bounces to the **worker (fix the report) or reviewer (re-review the work)** — a lying or unprovable report is a finding (the 068 discipline: queueing-is-a-finding extends to claiming-is-a-finding).
4. The owner-facing output loses the verbosity permanently; the full report stays in the session file as the evidence of record.

## Standing constraints (every row)

Schema-driven · loud-skip (no key/error → the agent does the work, surfaced) · confidence-gated (<0.6 → the deterministic path) · never closing alone (extraction and judgment candidates feed deterministic gates, the sieve, or the reviewer) · `TYPELLM_API_KEY` env-side (074 pin).

## Suggested rollout

Task 1 first (transport upgrade — everything else rides it), then Task 2 (the owner's pain, the clearest contract) → Tasks 3+4 together (shared mining machinery) → Tasks 5+6 (extraction pair). Each row lands with its own fixture harness mode (the Phase-1 pattern) and reports accuracy before the next.

## Risks / open questions

- Session-turn pointers need a stable addressing scheme (entry index — session files are JSONL with stable order).
- Claim verification costs calls: batch claims per report (one call, N claims) — the Phase-3 batching pattern.
- Row 3 must not replace contracts as context (augment-only) — enforcement via the harness (compare worker success with/without).
- Hallucinated turn pointers: the verifier must treat a wrong pointer as FALSE (pointer accuracy is part of the claim).
