spec: task
name: "docs-stubs-ship"
tags: []
---

## Intent

Ship prep for v0.12.2 plus the owner-approved stub retirement: refresh the README `/next`/`/auto-next` rows (mechanism note: dispatcher tool), retire the `/scout` and `/integrate` removal stubs (delete `prompts/scout.md` + `prompts/integrate.md`, clean their README rows, update the `/scout` reference in `skills/plan/SKILL.md` to `/explore`), add the CHANGELOG v0.12.2 entry, bump 0.12.1 → 0.12.2.

## Decisions

- Stub retirement: both prompt files deleted; the README command rows removed; `skills/plan/SKILL.md` L19's "`/scout` or read exploration output" becomes "read exploration output (`/explore`)"; the L439 flow-table `/scout → TASK 1` row becomes `/explore → TASK 1`. The scout ROLE (`agents/scout.md`) STAYS — brainstorm/plan flows dispatch it as a role.
- README `/next`/`/auto-next` rows gain the mechanism note (dispatcher tool, deterministic selection).
- CHANGELOG head: `2026-10-26 — v0.12.2: next-thinner — dispatcher as an extension tool` with bullets: dispatch_next tool, verdict automation, wave-settle compaction in-extension, thin prompts, stub retirement.
- package.json 0.12.1 → 0.12.2.

## Boundaries

### Allowed Changes
- README.md
- CHANGELOG.md
- package.json
- prompts/scout.md (delete)
- prompts/integrate.md (delete)
- skills/plan/SKILL.md (/scout reference updates only)

### Forbidden
- Do not touch `extensions/index.ts`, `tests/**` (TASK 1/TASK 2 landed), `prompts/next.md`, `prompts/auto-next.md` (TASK 3 landed), `agents/scout.md` (role stays).
- Do not remove other README command rows.
- Do not alter the scout role file or its registration.

## Completion Criteria

Scenario: stubs retired
  Test: ! test -f prompts/scout.md && ! test -f prompts/integrate.md && ! grep -q "/scout" README.md && ! grep -q "/integrate" README.md
  Given the repo after the change
  When the prompts and README are inspected
  Then both stub prompts are deleted
  And their README rows are gone

Scenario: plan skill routes to explore instead of the stub
  Test: grep -q "(/explore)" skills/plan/SKILL.md && ! grep -q "(/scout" skills/plan/SKILL.md
  Given skills/plan/SKILL.md after the change
  When the former /scout references are inspected
  Then they route to /explore
  And the scout ROLE file and its registration stay untouched

Scenario: version bumped
  Test: node -e "process.exit(require('./package.json').version === '0.12.2' ? 0 : 1)"
  Given package.json after the change
  When the version field is read
  Then it equals 0.12.2
