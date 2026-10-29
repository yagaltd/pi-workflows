spec: task
name: "resume-digest-script"
tags: []
---

## Intent

Land `scripts/resume-digest.sh`: a read-only script that emits a fixed-shape restart digest — (1) plan status (Status line + ✅ markers from `.workflows/plan.md`, or "no live plan"); (2) dispatcher context (`.workflows/queue.json` row count + FINAL-verdict count in `.workflows/reviews/`); (3) last 10 `.workflows/LOG.md` lines; (4) budget from `.workflows/budget.json`; (5) dirty paths (`git status --short`); (6) gates snapshot: the profile's `gates[]` run in order (tail) + the profile's `commands.test` (tail); (7) `git log --oneline -10`. First consumer of the project profile (gates + test command read from `.workflows/profile.json`).

## Decisions

- Read-only: the script writes NOTHING — every output goes to stdout; the caller redirects.
- Profile consumption: `gates[]` and `commands.test` from `.workflows/profile.json` (python3 JSON — no deps). Missing profile ⇒ run the built-in default set (check-drift, docs-lint, agents-lint, bun test) and print one `note: profile missing — defaults used` line. Degradation, never silence; exit stays 0.
- Every section degrades to a `note:` line when its source is absent (no plan, no budget, no LOG) — exit 1 only when the repo itself is broken (no .git).
- Section headers are fixed literal lines (`== resume: plan status ==` etc.) so callers and tests can grep them.
- Gate/test tails: last 5 lines of each gate run; the bun tail is the last 2 lines.

## Boundaries

### Allowed Changes
- scripts/resume-digest.sh

### Forbidden
- Do not touch `prompts/**`, `README.md`, `skills/**` (TASK 2 scope), `extensions/**`, CHANGELOG/package.json (TASK 3 scope), `.workflows/profile.json` (consumed, not modified).

## Completion Criteria

Scenario: digest runs on this repo
  Test: bash scripts/resume-digest.sh > /tmp/p42-digest.txt && grep -q "== resume: plan status ==" /tmp/p42-digest.txt && grep -q "== resume: gates ==" /tmp/p42-digest.txt && grep -q "== resume: git ==" /tmp/p42-digest.txt
  Given this repo after the change
  When the digest runs and redirects to a file
  Then it exits 0 with the fixed section headers present

Scenario: digest is read-only
  Test: find . -type f -newer AGENTS.md -not -path './.git/*' -not -path './node_modules/*' > /tmp/p42-before.txt; bash scripts/resume-digest.sh > /dev/null; find . -type f -newer AGENTS.md -not -path './.git/*' -not -path './node_modules/*' > /tmp/p42-after.txt; diff /tmp/p42-before.txt /tmp/p42-after.txt
  Given the repo tree snapshotted before and after a digest run
  When the file lists are compared
  Then no file changed (digest writes nothing)

Scenario: profile fallback degrades with a note
  Test: mv .workflows/profile.json /tmp/p42-profile.json; bash scripts/resume-digest.sh > /tmp/p42-fallback.txt 2>&1; rc=$?; mv /tmp/p42-profile.json .workflows/profile.json; test $rc -eq 0 && grep -q "note: profile missing" /tmp/p42-fallback.txt
  Given the profile temporarily moved away
  When the digest runs
  Then it still exits 0 and prints the fallback note line

Scenario: budget section present
  Test: bash scripts/resume-digest.sh 2>/dev/null | grep -q "== resume: budget =="
  Given this repo
  When the digest runs
  Then the budget section header appears
