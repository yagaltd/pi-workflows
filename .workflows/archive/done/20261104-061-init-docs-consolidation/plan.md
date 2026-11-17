# Plan — 20261104-061: /init Phase 5 docs-consolidation step (brownfield note triage)

> Plan ID: 20261104-061
> Source: owner trial — /init on brownfield `~/Documents/current/agents-apps/agent-mailbox` left design notes "untouched" forever; `agent-subscription` /init incomplete (pre-059). Root clutter persists because Phase 3 documents notes but Phase 5 never consolidates them.
> Created: 20261104
> Owner: Aurel

**Status:** DONE (shipped v0.14.18 — archived 20261117 by plan 064 T1)

## Intent

A new Phase 5 step — **Docs consolidation** — turns brownfield root-level design notes into first-class pi-workflows artifacts: decisions become ADRs, superseded notes archive, living references move to docs/, roadmap-type notes become queue/proposals. Owner-gated, never destructive.

## Verified facts

- /init Phase 5 today: 9 steps (1 Charter, 2 Profile, 3 CONTEXT.md seed, 4 README skeleton, 5 LOG, 6 Charter probe BLOCKING, 7 Dev environment mise, 8 Model policy, 9 Hand off). Phase 3 documents existing notes as "untouched"; no step ever consolidates them.
- Destination convention exists: `.workflows/decisions/` (ADRs), archive, docs/, queue/proposals.
- Existing pins quote CONTENT phrases (T6 "SKIP LOUDLY", T9 "cannot proceed", T10 "[tasks]"), not step numbers — but step renumbering must be verified against every pin anyway.
- Live trial evidence: agent-mailbox Phase 3 output (owner-provided); agent-subscription incomplete scaffold (no mise.toml, thin .workflows) — post-059 re-init will catch it.

## What — T1 (single worker, TDD)

1. **skills/init/SKILL.md** — insert Phase 5 **step 8: Docs consolidation** (after mise, before Model policy; Model policy → 9, Hand off → 10 — renumber carefully, verify every pin after renumber):
   - **Inventory**: reuse the Phase 3 TREE listing — loose root-level `*.md` notes (design notes, roadmap notes, refactor notes, *refactor* patterns).
   - **Classify** each into exactly one destination; render the classification table in chat:
     | Note kind | Destination |
     | Records a decision + rationale | `.workflows/decisions/ADR-NNNN-<slug>.md` (date, status, context, decision, consequences) |
     | Superseded / historical | archive (`archive/done/<area>/`) |
     | Living reference (still true) | `docs/` |
     | Roadmap / future work | `.workflows/` queue or proposals |
     | Referenced elsewhere | move + update references (grep the filename repo-wide); never delete |
   - **🛑 GATE**: owner approves the classification before anything moves. Unclassifiable notes stay put and are listed as open questions.
   - **Execute** the approved moves; convert decision notes to ADR structure; update references; append the moves to LOG.
   - **Self-probe**: after execution, WARN-tier listing of any root-level notes still unclassified (init proceeds; the WARN is recorded in LOG).
2. **Renumber guard**: Model policy 8→9, Hand off 9→10; every step number referenced elsewhere in the skill re-checked.
3. **Pins T11** in tests/prompt-doctrine.test.ts (RED first): (a) consolidation step exists with the four-destination classification; (b) 🛑 owner GATE before any move; (c) never-delete + reference-update rule; (d) post-move WARN self-probe.
- Verdict: orchestrator-inline Tier A; ship v0.14.18.

## Docs impact

- skills/init/SKILL.md (Phase 5 step insertion + renumber), tests/prompt-doctrine.test.ts

## Risks / assumptions

- ⚪ Renumbering step numbers may touch T9/T10 pin phrasing — worker must run the full prompt-doctrine suite after renumber, not just T11.
- ⚪ First live users: agent-mailbox (consolidation) + agent-subscription (re-init) — owner go needed, separate from this plan.

## Tasks

- **T1** (single worker, low): all of the above. TDD red first (T11 pins).
