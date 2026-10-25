spec: task
name: "verify-landing.sh tripwire script"
tags: [tooling, tripwire, bash, anti-phantom]
max-rounds: 2
---

## Intent

A mechanical detector for phantom subagent work: given a repo and a task's Allowed paths, prove whether work actually landed there — and whether the worker's claimed files exist. Catches wrong-directory execution and fake projects by LOCATION, not volume (LOC metrics rejected: the incident's phantom produced a full project).

## Decisions

- D6 interface: `verify-landing.sh <repo> <allowed-path>...` with optional newline-separated claimed files on stdin.
- S1 landing check (binary): `git status --porcelain -- <allowed>` empty → ALARM + exit 1. Non-repo / inaccessible → ALARM + exit 2.
- S2 claims-vs-reality: each claimed file must appear in the status output; any miss → ALARM + exit 1.
- S3 magnitude (informational, never fails): `git diff --numstat` totals + explicit untracked-file count (numstat skips untracked — known gap from prototyping).
- `--selftest` mode: builds mktemp fixture repos and asserts all four behaviors; exit 0 only if all pass; prints one PASS line per case.
- Portability: bash + git + awk only. No tokei, no node, no deno.

## Boundaries

### Allowed Changes
- tooling/verify-landing.sh (new; executable bit set)

### Forbidden
- Everything else — agents/**, .workflows/**, skills/**, extension code

## Completion Criteria

Scenario: Clean repo with claimed done work
  Test: tooling/verify-landing.sh --selftest (case: clean)
  Given a fixture git repo with no changes in allowed paths
  When the script runs against it
  Then S1 ALARM "zero diff" + exit 1

Scenario: Landed work passes
  Test: tooling/verify-landing.sh --selftest (case: landed)
  Given a fixture repo with an edit inside allowed paths
  When the script runs
  Then OK line with magnitude summary + exit 0

Scenario: Claimed file missing from worktree
  Test: tooling/verify-landing.sh --selftest (case: phantom-claim)
  Given a fixture repo with landed edits but a stdin claim naming a file absent from git status
  Then S2 ALARM naming the file + exit 1

Scenario: Non-repo target
  Test: tooling/verify-landing.sh --selftest (case: non-repo)
  Given a plain directory without .git
  Then ALARM "not a git repo" + exit 2

Scenario: Selftest aggregates
  Test: tooling/verify-landing.sh --selftest
  Given all four fixtures
  Then four PASS lines, exit 0
