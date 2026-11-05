# Proposal — 20261104-056: idea ledger + TypeLLM triage (DRAFT — awaiting approval)

> Plan ID: 20261104-056
> Source: owner-directed — chat research dies in the transcript; /plan misses points or stacks everything
> Created: 20261104
> Owner: Aurel

## Intent

Close the chat→plan gap: an append-only ideas ledger captures candidate ideas during ordinary sessions; at /idea or /plan time ONE TypeLLM judgment call extracts, classifies, and refines every untriaged idea; the plan cites the triage verdicts and carries a visible stacking flag.

## Facts pinned (research)

- pi-workflows has zero chat-phase idea capture; /brainstorm's ledger covers only its own divergent flow (`.workflows/research/<slug>/ledger.md`).
- `scripts/judge.mjs` is the single judge client (plan-029 doctrine): typesafe `/v1/systemone`, `{id,question,schema}` noul/choice shape, 64-question cap, NO-JUDGE = exit 0 + skip note. The triage needs `/v1/generate`'s richer shape (instructions/levels/`when`) → **v1 rides the native in-session `typellm_judge` tool**; judge.mjs untouched (single-client doctrine preserved, subtract-first).
- Exact triage shape (from typellm.ai/docs/api + repo README): per idea `i{n}_summary` (extract, string) → `i{n}_category` (enum now/explore/nice-to-have/reject/ask-owner) → `i{n}_why` (one line) → `i{n}_value` (levels Nice-to-have/Useful/Critical, `when` category≠reject) → `i{n}_effort` (levels Minutes/Half-day/Multi-day, `when` category∈{now,explore}) + one batch-level `stacking_risk` (levels Lean/Balanced/Stuffed). ~10 ideas × 5 questions fits one call under the 64 cap.

## What

- **T1** (single task):
  - `.workflows/ideas.md` (new): append-only, one bullet per idea — `- [YYYYMMDD] <idea> (source: chat|session)`; agent is single writer, like LOG.md.
  - `skills/plan/SKILL.md` + `skills/idea/SKILL.md`: a **Triage step** — if ideas.md has untriaged lines, run the judgment call above via the native typellm_judge tool; render the verdict table (idea / category / value / effort / why) inline; the plan cites it; `Stuffed` ⇒ the draft is flagged back to the owner before contracts are written. NO-JUDGE: tool unavailable ⇒ visible skip note, plan proceeds (degradation is the tested default, plan-017 doctrine).
  - Pins: T8 describe in tests/prompt-doctrine.test.ts — triage step present in both SKILLs, verdict citation required, NO-JUDGE note present, ideas.md format documented.
- Ship **v0.14.12** after Tier A inline verdict (docs/skill-only micro-plan).

## Docs impact

- `skills/idea/SKILL.md`, `skills/plan/SKILL.md`, `tests/prompt-doctrine.test.ts`, `.workflows/ideas.md` (new)

## Risks / assumptions

- ⚪ typellm_judge is session-native (verified in this session's toolset) — no new client code.
- ⚪ Triage is advisory+visible (citation + flag), not a hard gate — a plan can proceed on NO-JUDGE.
- ⚪ Additive-only; no existing pin touched.

## Tasks

- **T1** (single, low): all of the above. TDD red first (T8 pins).
- Verdict: orchestrator-inline Tier A; ship v0.14.12.
