spec: task
name: archive-drift-gate
tags: [gate, drift, archive, tests]
verify: "bash scripts/check-drift.sh && bun test"
max-rounds: 3
---

## Intent

Two silent failures let nine plans slip past the archive gate: nothing checked that a shipped plan id has a bundle, and `check-archive.sh` counts only backticked spans, so a `## Docs impact` section written in prose passes without verifying a single path. Add a drift section for the first and make the second a finding.

## Decisions

- The new drift section reads the first 10 CHANGELOG entries only (bounded work, matches "recent shipped history").
- Absent `.workflows/archive/` (fresh clone, gitignored state) is a LOUD skip, never a failure — the gate must stay usable outside a full local checkout.
- `check-archive.sh`: a `## Docs impact` section whose paths are never backticked is a finding (the section exists to be machine-checkable), and the hint names templates/PROPOSAL-FORMAT.md.

## Boundaries

### Allowed Changes
- scripts/check-drift.sh
- scripts/check-archive.sh
- scripts/scaffold.sh
- scripts/profile-lint.sh
- .workflows/profile.json
- templates/DECISION.md
- tests/archive-drift.test.ts
- tests/fixtures/archive-drift/**

### Forbidden
- docs/**, README.md (documentation of the gate chain is the orchestrator's SHIP step)
- Every other script, prompt, skill, agent, extension, template
- The long-form templates/ADR.md (stays as the manual ADR reference; the `adr`
  scaffold kind emits ledger records, which is what the repo actually writes)

## Completion Criteria

Scenario: shipped plan id without a bundle fails the gate
  Test: fixture CHANGELOG id with no archive dir is reported
  Given a fixture pair (CHANGELOG naming an id, archive tree lacking it)
  When the section runs against the fixture
  Then it reports the id with file:line and exits non-zero

Scenario: shipped plan id with a bundle passes
  Test: fixture CHANGELOG id with an archive dir is clean
  Given a fixture pair where the archive tree contains the id
  When the section runs
  Then it reports ok and exits zero

Scenario: missing archive dir skips loudly
  Test: absent archive tree prints a skip line
  Given a repo state with no .workflows/archive/
  When check-drift.sh runs
  Then the section prints a skip naming the absent dir and the run does not fail

Scenario: unbackticked Docs impact paths are a finding
  Test: prose-only Docs impact section fails check-archive
  Given a plan dir whose "## Docs impact" lists paths without backticks
  When check-archive.sh runs on it
  Then it fails with a finding pointing at the section and templates/PROPOSAL-FORMAT.md

Scenario: every whitelisted durable-knowledge path is git-tracked
  Test: durable path audit inside check-drift
  Given the .workflows whitelist in .gitignore
  When the section runs
  Then each whitelisted durable path (LOG.md, CONTEXT.md, ideas.md, tree.json, proposals/, reviews/, archive/, decisions/, profile.json, evals/) either has at least one tracked file or is reported as a finding
  And a path that is ignored while a plan depends on it (the DEC ledger case, .workflows/decisions/ before 20261117) fails loudly

Scenario: the adr scaffold emits what the ledger can parse
  Test: scaffold.sh adr output round-trips through decisions.mjs
  Given `bash scripts/scaffold.sh adr <name>` renders from the profile target
  When the produced file is run through `node scripts/decisions.mjs check`
  Then it parses as a ledger record (heading `# DEC-<n>:` and the short-record shape the ledger uses)
  And the filename matches the ledger convention `DEC-<nnn>.md`, not `DEC-<nnn>-<name>.md`
  And a scaffold whose output the ledger rejects is a finding, never a silent success

Scenario: the repo itself is clean
  Test: real repo passes the new section
  Given the repo after the back-fill
  When `bash scripts/check-drift.sh` runs
  Then the new section reports ok and the overall run exits 0
