spec: task
name: "resume-prompt-wiring"
tags: []
---

## Intent

Wire the digest into the command surface: `prompts/resume.md` (thin trigger, ≤ 25 lines — run `bash scripts/resume-digest.sh`, then act on the digest per house rules: plan lifecycle, `/next`, `/review`; no selection logic of its own); README command-table row for `/resume`; init's WIRE handoff line names `/resume` as part of what a fresh project carries.

## Decisions

- The prompt: frontmatter (`description` only) + "run the digest" + "treat the digest as the state" + pointer to the plan lifecycle (`agents/execution-doctrine.md`) + the restart-specific rules (verify before acting; a dirty tree is reported, not stashed). Nothing else.
- README row: `/resume | Restart context: run the state digest (plan, verdicts, budget, gates, git), then act on it.`
- init handoff: one clause added to the existing handoff step naming `/resume`.

## Boundaries

### Allowed Changes
- prompts/resume.md
- README.md
- skills/init/SKILL.md

### Forbidden
- Do not touch `scripts/**` (TASK 1 landed), `extensions/**`, CHANGELOG/package.json (TASK 3 scope), other prompts, `.workflows/profile.json`.

## Completion Criteria

Scenario: prompt is a thin trigger
  Test: test $(wc -l < prompts/resume.md) -le 25 && grep -q "resume-digest.sh" prompts/resume.md && ! grep -qiE "select the task|pick the first|wave discipline" prompts/resume.md
  Given prompts/resume.md after the change
  When it is measured and inspected
  Then it is at most 25 lines, names the script, and carries no selection logic

Scenario: readme row present
  Test: grep -q "resume-digest" README.md
  Given README.md after the change
  When the command table is inspected
  Then the /resume row names the digest

Scenario: init handoff names the command
  Test: grep -q "/resume" skills/init/SKILL.md
  Given skills/init/SKILL.md after the change
  When the handoff step is inspected
  Then it names /resume as part of what a fresh project carries
