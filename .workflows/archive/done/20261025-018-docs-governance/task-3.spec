spec: task
name: "archive-docs-gate"
tags: []
---

## Intent

Add the archive gate (backlog item 6, archive half): `scripts/check-archive.sh <plan-dir>` verifies a shipped plan honored its Docs impact declaration — every doc path declared in the plan's Docs impact section exists in the repo, and CHANGELOG mentions the plan ID. Wire it into the SHIP step so the archive move refuses on failure.

## Decisions

- Input: a plan directory containing `plan.md`. The script extracts the Docs impact declared paths (lines following the `## Docs impact` heading, backtick paths) and the Plan ID (from the `> Plan ID:` line), then checks: each declared path exists; `CHANGELOG.md` contains the Plan ID.
- Any missing declared doc or missing CHANGELOG mention ⇒ exit non-zero with file:line findings. No Docs impact section ⇒ fail with a format hint pointing at `templates/PROPOSAL-FORMAT.md`.
- Wiring: the SHIP rule in `skills/plan/SKILL.md` and the SHIP step in `prompts/review.md` gain one line: run `bash scripts/check-archive.sh <archive-target-dir>` before the bundle move.

## Boundaries

### Allowed Changes
- scripts/check-archive.sh
- skills/plan/SKILL.md
- prompts/review.md

### Forbidden
- Do not touch `templates/**` (TASK 2 scope), `scripts/docs-lint.sh` (TASK 1 scope), README, CHANGELOG, package.json (TASK 4 scope).
- Do not add dependencies; bash + grep only.

## Completion Criteria

Scenario: passes when declared docs exist and changelog mentions the plan
  Test: grep -q "check-archive.sh" skills/plan/SKILL.md && grep -q "check-archive.sh" prompts/review.md
  Given a fixture plan dir whose Docs impact declares an existing doc and CHANGELOG mentions the Plan ID
  When check-archive.sh runs on the fixture
  Then it exits 0

Scenario: fails when a declared doc is missing
  Test: grep -q "PROPOSAL-FORMAT" scripts/check-archive.sh
  Given a fixture plan dir declaring a doc path that does not exist
  When check-archive.sh runs on the fixture
  Then it exits non-zero naming the missing path

Scenario: fails when the changelog lacks the plan id
  Test: grep -q "CHANGELOG" scripts/check-archive.sh
  Given a fixture plan dir whose docs all exist but CHANGELOG lacks the Plan ID
  When check-archive.sh runs on the fixture
  Then it exits non-zero naming the missing CHANGELOG entry
