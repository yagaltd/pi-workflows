spec: task
name: "readme-rebuild-extraction"
tags: []
---

## Intent

Rebuild `README.md` as the shop window (≤ 200 lines, 7 sections) per templates/DOCS-POLICY.md: extract the "How It Works" narration (~L158–475) into `docs/architecture.md` (new), updated to the v0.13.0 state; remove the four version-titled sections after verifying their CHANGELOG counterparts. The commands table regenerates from `prompts/*.md` (23 prompts = 23 rows).

## Decisions

- README sections, in order: what-it-is paragraph · Install · Quick Start · Commands (one table, regenerated: every prompt file = one row with its frontmatter description) · The loop (short: plan → approve → dispatch → gate → SHIP) · Gates (one table: the 10 check-drift sections, one row each) · Pointers (AGENTS.md, docs/canon.md, docs/architecture.md, CHANGELOG.md) · License. Nothing else.
- docs/architecture.md: the extracted sections (The flow · Gates · Three hard rails · Reviewer integrity · Contracts · Durable rules · Planning · Agents · The extension · Bottleneck tags · Testing strategy matrix · Worker blocker protocol · Quality pipeline · Cost strategy · Doc-drift gate · Casual intake · Judge · Dispatcher and auto-gate) updated to v0.13.0: dispatch_next tool, verdict automation + wave-settle, project profile + profile-lint, agents-lint, scaffolds, metric gates, /resume. Every behavioral claim names its gate (canon rule 4).
- CHANGELOG dedupe: the four version-titled README sections must have CHANGELOG counterparts (they shipped via plans 018/019/022/015); verify, and append any missing under their original date+version.
- Contract Format section (L476+): keep in README ONLY as a pointer to templates/CONTRACT-FORMAT.md (the template is the authority); the inline copy moves to docs/architecture.md's contracts section if not already there.

## Boundaries

### Allowed Changes
- README.md
- docs/architecture.md
- CHANGELOG.md

### Forbidden
- Do not touch `templates/**` (TASK 2 scope for DOCS-POLICY), `skills/**`, `prompts/**`, `extensions/**`, `scripts/**`, `docs/canon.md`, AGENTS.md, package.json (TASK 2 scope).

## Completion Criteria

Scenario: readme is the shop window
  Test: test $(wc -l < README.md) -le 200 && grep -q "## Install" README.md && grep -q "## Quick Start" README.md && grep -q "## Commands" README.md && grep -q "## Gates" README.md && ! grep -qE '^#{2,3} .*\((v0\.[0-9]+\.[0-9]+)\)' README.md && ! grep -q "How It Works" README.md
  Given README.md after the change
  When it is measured and inspected
  Then it is at most 200 lines with Install/Quick Start/Commands/Gates sections
  And no version-titled headings and no How-It-Works narration remain

Scenario: commands table matches prompts
  Test: test $(grep -c '^| `/' README.md) -ge 23
  Given the commands table after the change
  When rows are counted
  Then at least 23 prompt-backed rows exist (one per prompts/*.md with a command)

Scenario: architecture doc carries the extraction
  Test: test -f docs/architecture.md && grep -q "Three hard rails" docs/architecture.md && grep -q "Reviewer integrity" docs/architecture.md && grep -q "dispatch_next" docs/architecture.md && grep -q "profile-lint" docs/architecture.md
  Given docs/architecture.md after the change
  When its content is inspected
  Then the extracted sections appear, updated to the v0.13.0 state

Scenario: changelog counterparts verified
  Test: grep -q "Doc-drift" CHANGELOG.md || grep -q "doc-drift" CHANGELOG.md
  Given CHANGELOG.md after the dedupe
  When the four removed README sections are checked
  Then each topic has a CHANGELOG counterpart (doc-drift, casual intake, judge, dispatcher)
