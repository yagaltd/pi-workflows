# Documentation policy — what goes where, and when it updates

Referenced by `/init` (README skeleton), `/next` (docs auto-check),
`/review` (SHIP gates), and the charter. Normative.

## The three homes (plus one)

| Artifact | Content | Update discipline |
|---|---|---|
| **README.md** (repo root) | Current-state user docs: what it is, install, quick start, usage. The shop window. | **Same task as the behavior change** — never a later catch-up commit. If a task changed behavior a README reader would notice, the README changes in that task's round. |
| **CHANGELOG.md** (repo root) | Append-only, curated, user-facing history: one entry per shipped plan (Plan ID + what changed + why, from the human's perspective). | **At `/review` SHIP only** — the orchestrator appends the plan's entry as a mechanical SHIP step. Never edited retroactively; never in worker tasks. |
| **docs/** (project, if the user wants it) | Long-form user/operator docs: guides, how-tos, deep explanations, API references. | Per `/docs` rules; keep in sync with behavior like README. |
| **.workflows/docs/** (workflow state) | Internal working docs: architecture.md (modules/data flow/tree), adr/, onboarding. Generated + maintained by `/docs` and docs-check. | Architecture.md seeded at `/init`, updated when architecture changes (docs-check gates it after each task). |

## What never goes where

- **No changelog notes in docs** — docs are current state, "Previously…"
  and "Updated to…" are banned. History lives ONLY in CHANGELOG.md (and
  LOG.md for workflow events).
- **No code walkthroughs** — never duplicate what's obvious from reading
  the code; explain WHY, not line-by-line WHAT.
- **No mixing** — README ≠ CHANGELOG ≠ docs/; one concern per artifact.
- **Workers never write CHANGELOG.md** — it's an SHIP-gate artifact,
  orchestrator-written (single-writer doctrine).
- **.workflows/docs/ stays internal** — user-facing material goes to
  README/docs/, never the reverse.

## README freshness gate (the rule with teeth)

A behavior change whose README implications land in a later commit is a
doc-drift bug. Enforcement points:

1. **Worker closeout** (in `/next` step 6): the docs auto-check includes
   README — "if this task changed behavior a README reader would notice,
   update README.md in this task's round."
2. **`/review` Layer 4** (pre-SHIP check): diff the plan's changes
   against README's claims — behavior documented in README but not in the
   diff, or behavior in the diff absent from README (install steps, new
   commands, changed defaults) → finding, fix before SHIP.
3. **CHANGELOG step** (SHIP): before commit, the orchestrator appends the
   plan entry (Plan ID, date, user-facing changes) — mechanical, never
   skipped.

## AGENTS.md (project) — binding rules + pointers, nothing else

AGENTS.md is the most expensive real estate in the system: pi auto-loads
it for **every session, every subagent, always** (ancestors of cwd only —
verified). Bloat there is paid on every dispatch, forever.

**Goes in AGENTS.md:**
- Binding rules agents must not violate (containment, commit discipline,
  "never do X")
- **One-liner facts** the agent needs constantly — e.g. `Test: npm test`
- **Pointers** to detail docs read on demand — e.g. `Tests detail:
tests/README.md (coverage, watch mode, fixtures)`

**Never goes in AGENTS.md:**
- Full command inventories (that's what the pointer target is for —
  `tests/README.md`, `docs/conventions.md`)
- Anything from README.md (install/usage are human-facing; the agent
  doesn't need them at every turn)
- History/changelog notes (banned everywhere but CHANGELOG.md)

**Why pointers, not nested AGENTS.md files**: pi loads context files
walking *up* from cwd — a nested `tests/AGENTS.md` only loads when a
session's cwd is inside `tests/`, which almost never happens (sessions
run at project root). So nested AGENTS.md files are silently dead
weight; a `tests/README.md` referenced by pointer is read exactly when
needed and costs nothing otherwise.

**Budget**: keep the project's AGENTS.md under ~50 lines. If it grows,
move detail to pointer targets and keep the rules.

## CHANGELOG entry shape

```markdown
## <version or Plan ID> (<date>)
### Added / Changed / Fixed / Removed
- <what changed — user's perspective, one line each>
```

Curated, not exhaustive: internal refactors invisible to users don't get
entries; user-visible changes always do.

## Charter line (AGENTS.md carries this)

"Docs discipline: README changes land in the same task as the behavior
change; CHANGELOG.md is appended only at /review SHIP (orchestrator-written);
docs describe current state — history never leaks into them."
