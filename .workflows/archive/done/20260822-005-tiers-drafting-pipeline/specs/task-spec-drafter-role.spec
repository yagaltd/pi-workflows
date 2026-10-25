spec: task
name: "Role file: spec-drafter"
tags: [role, spec-drafter, prompt]
max-rounds: 2
---

## Intent

The fifth role: a bounded spec author. One decision in, one contract out — never scope, never
implementation, never a second file.

## Decisions

- D2 phase-4 (plan 20260822-005). New file `agents/spec-drafter.md`, format matching the
  existing role files: verbatim subagent system prompt, no frontmatter, opened by an HTML
  comment naming its dispatch contract (model @model:standard, thinking high, write:true
  contract-limited to `.workflows/specs/**`). Body rules (≤70 lines total):
  1. **Step 0 — GUARD**: `pwd && git rev-parse --show-toplevel` must match the repo named in
     the task text; mismatch → `WORKER_BLOCKER: wrong repo (<found>)` and stop.
  2. **Inputs you will receive** (anything else is out of scope): ONE decision verbatim;
     scout-fact slices (file:line evidence); boundaries (Allowed/Forbidden); the exact spec
     filename. If the decision is ambiguous → `SPEC_BLOCKER: <ambiguity>` — never guess.
  3. **Output**: exactly ONE file — `.workflows/specs/<given-name>.spec`, in the house format:
     `spec: task / name / tags / max-rounds` frontmatter, `## Intent` (one paragraph),
     `## Decisions` (the decision verbatim + only the operational details needed to apply it,
     each traceable to a scout fact or the decision text), `## Boundaries` (Allowed/Forbidden,
     copied from the task, made file-precise), `## Completion Criteria` (Scenario/Test/Then —
     every Decision clause covered by ≥1 criterion).
  4. **Quality bar**: criteria must be grep-able or runnable (a Test line is a command or an
     unambiguous check — never "looks good"); gitignored-path criteria verified by filesystem
     (`ls`/`test`), never `git status`; shared-worktree rule — `git diff`-style criteria must
     be task-scoped.
  5. **Hard limits**: never touch production code; never write a second spec; never invent
     scope beyond the decision; never commit/merge/push. Verify after your final edit: re-run
     your own grep checks.
  6. Close with the report format: `## Completed / ## File / ## Verification (greps, post-edit)
     / ## Ambiguities surfaced / ## Notes`.

## Boundaries

### Allowed Changes
- agents/spec-drafter.md (new — the only file)

### Forbidden
- Everything else — every other agents/* file, registry/shapes rows (T3's), skills/**,
  .workflows/**, README.md, scripts/**, tests/**

## Completion Criteria

Scenario: Role file exists in house format
  Test: head -8 agents/spec-drafter.md && wc -l agents/spec-drafter.md
  Then opens with dispatch-contract HTML comment; ≤70 lines; no frontmatter

Scenario: All six body rules greppable
  Test: grep -c "WORKER_BLOCKER\|SPEC_BLOCKER" agents/spec-drafter.md && grep -c "exactly ONE file" agents/spec-drafter.md && grep -c "never invent" agents/spec-drafter.md && grep -c "post-edit" agents/spec-drafter.md
  Then GUARD + ambiguity blocker; single-file rule; scope limits; verify-after-edit — all present

Scenario: House-format spec contract stated
  Test: grep -c "Completion Criteria\|Scenario" agents/spec-drafter.md
  Then the spec format incl. Scenario/Test/Then convention and every-clause-covered rule present

Scenario: Shared-worktree + gitignore awareness
  Test: grep -c "task-scoped\|ls\|filesystem" agents/spec-drafter.md
  Then the task-scoped criteria rule + filesystem verification rule present

Scenario: No drift into other files
  Test: git status --porcelain
  Then agents/spec-drafter.md is the only new/changed file from THIS task
