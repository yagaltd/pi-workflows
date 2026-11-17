# Follow-up table format — review findings queue (agent-spec 1.4)

The follow-up table is the review's reporting artifact: findings that are real
but out of the current plan's scope become a queue the next `/idea` can draw
from (plan 20261031-047 was seeded exactly this way, from plan 046's fix round).

**Rows are facts, not illustrations.** Every Problem and Impact must come from
the evidence trail (review verdicts, fix-round findings, LOG entries, scout
output) — verify each against the gating checkout before writing. A plausible
row you cannot cite is fiction, and fiction in the queue poisons the next plan.

**Three exit states.** Every row reaches `done`, `closed(reason)` or
`deferred(trigger: ...)` before a new plan opens — drain before grow.
**Delete, don't queue.** A row that cannot state Impact and Fix shape is
DELETED, not queued — subtract-first applies to the queue itself.

## Columns

Pinned set — do not add, drop, or reorder columns:

| # | Item | Origin | Problem (plain words) | Impact if unfixed | Risk (P0–P3) | Effort (S/M/L) | Fix shape |
|---|------|--------|-----------------------|-------------------|--------------|----------------|-----------|

- `#` — queue order; stable within a plan so tasks can reference rows by number
- `Item` — short grep-able name for the finding
- `Origin` — provenance: `planned` (on the ledger before this plan opened)
  or `new (<why>)` (found while working; never without the reason)
- `Problem (plain words)` — what is wrong, no jargon; a newcomer reads this column alone
- `Impact if unfixed` — the concrete consequence if it ships as-is
- `Risk (P0–P3)` — severity, per the scale below
- `Effort (S/M/L)` — size of the fix, not of the problem
- `Fix shape` — the shape of the fix in one line; never a full design

Amended once (20261117, plan `20261117-067`): the `Origin` column was added
after `Item` — provenance rides with identity. The set is otherwise pinned;
the next amendment updates this note, never silently reshapes the table.

Risk scale: **P0** blocker (data loss, security, build broken) · **P1** major
(gate red, workflow blocked) · **P2** moderate (noise, false alarms, missing
guardrail) · **P3** minor (degradation already loud, disposition-able).

## Worked example

Real queue from plan 20261031-047 (evidence: plan Decisions 1–5, plan 046
`reviews/fix-round.md`, scout 20261031):

| # | Item | Origin | Problem (plain words) | Impact if unfixed | Risk (P0–P3) | Effort (S/M/L) | Fix shape |
| --- | ----- | -------- | ----------------------- | ------------------- | -------------- | ---------------- | --------- |
| 1 | Suite state-hardening | planned | 20 test files read gitignored `.workflows/` live state; fresh clones and worker worktrees fail with ENOENT (11+ tests) | Workers and clones see a red gate; plan 046's CI could only run ci-lite | P1 | M | Fixtures for behavior tests; loud named skips (`SKIPPED (state absent)`) for live-consistency tests via a requireLiveState helper |
| 2 | CONTRACTS preamble | planned | CONTRACTS line 1 is prose before the first `@cc` directive; `cc-check format` exits non-zero | Lint failure is noise on every review running cc-check | P2 | S | Relocate the prose into a cc-check-accepted comment form |
| 3 | Guard per-spec scoping | planned | Multi-spec dir guard flags in-scope files "verification not passing" mid-plan (absolute/relative boundary rendering) | False alarms in every multi-task review; reviewers must hand-scope | P2 | M | Per-spec scoping at the call sites (flow-gates contract gate + prompts/verify.md) |
| 4 | Authoring standards | planned | Content-fact spec scenarios passed grep selectors while describing fiction (plan 046: CHANGELOG recipes were fabricated; caught by hand pre-review) | Gates miss fabricated content without a rule | P2 | S | Repo-truth cross-check rule in CONTRACT-FORMAT.md + repo-faithful layouts note in review SKILL.md |
| 5 | Retired test-quality tool | planned | Retired: the binary this row named never existed as an installable tool (npm 404, no GitHub project); DEC-003 was amended 20261117-064 to the tdd-guard chain and test-quality now runs `tdd-guard lint` / `verify` (see `.workflows/decisions/DEC-003.md`) | Gaming/weakening detection absent where TDD shape is not used | P3 | S | Record the accepted-skip disposition (TASK 5 of plan 20261031-047) |
| 6 | Ledger | planned | prose caveats | lost | `P2` | `S` | pin at SHIP |
| 7 | Steps | new (wiring) | step 5 twice | misread | `P3` | `S` | renumber |

Rows 6–7 (20261117, plan 067) demonstrate `Origin` — this plan's own queue.
