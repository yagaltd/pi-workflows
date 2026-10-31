spec: task
name: "authoring-reporting-standards"
tags: [docs, standards, templates]
verify: "grep -q 'repo-truth' templates/CONTRACT-FORMAT.md && grep -q 'repo-faithful' skills/review/SKILL.md && test -f templates/FOLLOW-UP-TABLE.md && grep -q 'Impact if unfixed' templates/FOLLOW-UP-TABLE.md && bash scripts/check-drift.sh"
---

## Intent

Turn plan 046's lessons into standing standards: repo-truth cross-checks for content-fact spec scenarios, repo-faithful layouts in reviewer briefs, and the follow-up/issue table as the mandatory reporting format.

## Decisions

- CONTRACT-FORMAT.md gains one writing rule: content-fact scenarios (prose claims about repo state — names, counts, inventory) must carry an explicit cross-check selector against the repo (e.g. recipe names vs `just --unsorted --summary`). Origin note: plan 046 fabricated-recipes class.
- review SKILL gains one line in Stage 2: reviewer briefs for runtime probes specify repo-faithful layouts (origin: plan 046 hook-probe lesson).
- NEW `templates/FOLLOW-UP-TABLE.md`: the standard follow-up/issue table. Columns exactly: `# / Item / Problem (plain words) / Impact if unfixed / Risk (P0–P3) / Effort (S/M/L) / Fix shape`. Rules: ≤7 columns; one line per cell; plain words; Risk reuses the P0–P3 severity scale; mandatory surfaces: /review Stage 2 findings, /idea backlog output, plan `## Risks` sections.
- The template embeds a demo table: the plan 047 queue itself (5 rows) as the worked example.

## Boundaries

### Allowed Changes
- templates/CONTRACT-FORMAT.md
- skills/review/SKILL.md
- templates/FOLLOW-UP-TABLE.md (new)

### Forbidden
- Do not modify specs, scripts, tests, AGENTS.md, prompts/
- Do not change review stage order or gate semantics — documentation only
- Do not introduce a second severity scale

## Completion Criteria

Scenario: repo-truth rule present in contract format
  Test: grep -q 'repo-truth' templates/CONTRACT-FORMAT.md
  Given the template after the edit
  When reading the writing rules
  Then content-fact scenarios must carry a repo-truth cross-check selector

Scenario: repo-faithful note present in review skill
  Test: grep -q 'repo-faithful' skills/review/SKILL.md
  Given the review skill after the edit
  When reading Stage 2
  Then reviewer briefs must specify repo-faithful layouts for runtime probes

Scenario: follow-up table template exists with the pinned columns
  Test: grep -q 'Impact if unfixed' templates/FOLLOW-UP-TABLE.md && grep -q 'Risk (P0–P3)' templates/FOLLOW-UP-TABLE.md && grep -q 'Effort (S/M/L)' templates/FOLLOW-UP-TABLE.md
  Given the new template
  When reading the column contract
  Then all three added columns appear with exactly these names, plus the <= 7-column cap rule

Scenario: template embeds the plan 047 queue as worked example
  Test: grep -q 'state-hardening' templates/FOLLOW-UP-TABLE.md
  Given the template
  When reading the demo section
  Then the plan 047 follow-up queue appears as a rendered example table

Scenario: drift stays clean across all three doc edits
  Test: bash scripts/check-drift.sh
  Given all edits landed
  When running the drift checker
  Then CLEAN — no drift
