---
description: "Audit — codebase map + adversarial pre-scan: know the terrain before planning"
argument-hint: "[scope] [--security]"
---

Map the codebase and hunt defects BEFORE planning. `/audit` answers
"what is this codebase, and where does it hurt?" — its outputs are durable
knowledge (`.workflows/knowledge/map.md`, never archived) and findings that
route into `/plan` as tasks.

You are the orchestrator. Dispatch policy: `agents/registry.md` in the
pi-workflows package (find the package root via a pi-workflows skill
location in your available-skills list, or `pi list`). Nothing here
commits, fixes, or plans — audit is read-only recon plus an adversarial scan.

## Phase 0: PREFLIGHT (0 subagents, quick bash)

```bash
git rev-parse --is-inside-work-tree 2>/dev/null || echo "not a git repo"
git status --porcelain | head -5
git log --oneline -10
find . -maxdepth 2 -name package.json -o -name Cargo.toml -o -name pyproject.toml -o -name go.mod 2>/dev/null | grep -v node_modules | head -3
find . -path ./node_modules -prune -o -type f \( -name '*.ts' -o -name '*.js' -o -name '*.py' -o -name '*.go' -o -name '*.rs' \) -print 2>/dev/null | grep -v node_modules | wc -l
ls tests test 2>/dev/null; cat package.json 2>/dev/null | grep -A5 '"scripts"'
```

Establish: stack, size (~file count sets recon budget), test presence,
dirty tree. If the repo is huge (>500 source files), scope the audit to
the argument's area or the riskiest module — say what you excluded and why.

## Phase 1: RECON — the context map (one scout subagent)

```text
subagent({
  agent: "audit-recon",
  prompt: "<verbatim body of agents/scout.md — thorough mode>",
  thinking: "medium",            // thorough recon, not a quick lookup
  background: false,
  task: `Map this codebase for an audit. Thoroughness: thorough.
Read .workflows/knowledge/map.md if present — update rather than rediscover.

Report exactly these sections:
## Modules (purpose + risk class per module)
## Trust boundaries (where untrusted input enters; auth checks)
## Service boundaries / data flow
## Known risk concentrations (large files, complex parsing, concurrency, crypto)
## Start Here (the 3 files an auditor should read first)`,
})
```

Persist the map (you are the single writer):

```bash
mkdir -p .workflows/knowledge .bug-hunter 2>/dev/null
```

Write `.workflows/knowledge/map.md` — headers: Modules, Trust boundaries,
Service boundaries, Risk concentrations, plus `Audit: <date> · <commit>` at
top. Existing map → merge new findings, keep the history line growing.

## Phase 2: HUNT — adversarial scan (one bug-hunter subagent)

Dispatch per the **bug-hunter shape** in `agents/dispatch-shapes.md`
(write toolset, high thinking, scan-only, artifacts under `.bug-hunter/`),
with this task text. If the bug-hunter skill is not installed, skip this
phase with a note (Phase 1's map + risk concentrations still have value).

```text
task: `Hunt defects in <TARGET: scope from argument or whole repo>.
Recon evidence: .workflows/knowledge/map.md (read it first — trust
boundaries and risk concentrations are your priority targets).
<If --security: add security review lenses — auth, injection, secret
handling, privilege escalation.>
Output ONLY the joined summary: confirmed / dismissed / manualReview /
unreviewed counts + first evidence line per confirmed finding.`
```

## Phase 3: DISTILL (orchestrator)

```markdown
# Audit: <scope> — <PASS | N FINDINGS>

## Context map
→ .workflows/knowledge/map.md (durable — feeds every future /plan)

## Confirmed findings
1. [P0] <finding> — <file:line> — <evidence>
2. [P1] ...

## Manual review queue (skeptic couldn't confirm)
- ...

## Risk concentrations worth watching
- from map.md, with why

## Route into planning
- P0/P1 findings → `/plan fix <finding>` (or a dedicated hardening task)
- Manual review queue → human triage
- Risk concentrations → consider tagging related future tasks 🔴/🟠
```

Append to `.workflows/LOG.md`:
`<date> AUDIT <scope> — <N confirmed / M manual review>`

🛑 STOP. Present the distillation. Do not plan, fix, or commit — that's
`/plan`'s job with the map as input.

## Rules

- Read-only + `.bug-hunter/` artifacts + the map — audit touches nothing else
- The map is DURABLE knowledge: never archived, updated (not replaced) each audit
- Findings need evidence (file:line + why) or they go to manual review, not confirmed
- `/audit` feeds `/plan`; it never becomes a plan itself
- Re-run per milestone or before big refactors — cheap compared to finding
  the same defects at `/review` time
