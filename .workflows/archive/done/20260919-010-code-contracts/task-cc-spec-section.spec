spec: task
name: "CONTRACT-FORMAT — Applicable contracts section + @cc writing rules"
tags: [contract-format, cc-check, spec-template]
max-rounds: 2
verify: grep -q "Applicable contracts" templates/CONTRACT-FORMAT.md && grep -q "Applicable contracts" skills/plan/SKILL.md
---

## Intent

Add the optional `## Applicable contracts` section to the .spec contract format — machine-generated `cc-check list` IDs for the task's files — plus contract writing rules for @cc (stable IDs, adr: attribute, invariants-not-ephemera). The plan skill's Phase 5 gains one line to populate it when contracts exist.

## Decisions

- Section is OPTIONAL: present only when the repo has contracts applicable to the task's Allowed Changes files; absent otherwise (never a placeholder).
- Content is machine-generated (`cc-check list` output: IDs + one-line prose) — the spec REFERENCES rules, never re-states them; Boundaries stays the ONLY boundary authority (no second authority created).
- Writing rules for @cc: stable kebab-case IDs unique per declaration; `label:` area attribute; optional `adr:` attribute naming governing ADR; invariants only — per-task behavior belongs in Completion Criteria.
- skills/plan/SKILL.md Phase 5 (GENERATE CONTRACTS): one line — populate `## Applicable contracts` via cc-check list when the repo has contracts.

## Boundaries

### Allowed Changes
- templates/CONTRACT-FORMAT.md
- skills/plan/SKILL.md

### Forbidden
- everything else, incl. agents/*.md, extensions/, tests/, README.md, other skills/ files

## Completion Criteria

Scenario: Section exists in the format doc
  Test: grep -q "## Applicable contracts" templates/CONTRACT-FORMAT.md
  Given templates/CONTRACT-FORMAT.md at HEAD
  When the edit lands
  Then the format documents the optional section with its exact title

Scenario: Machine-generated + reference-not-restate stated
  Test: grep -A10 "Applicable contracts" templates/CONTRACT-FORMAT.md | grep -q "cc-check list" && grep -A10 "Applicable contracts" templates/CONTRACT-FORMAT.md | grep -vqi "never re-state\|references"
  Given the new section documentation
  When read
  Then it says content comes from cc-check list and the spec references rules without re-stating them — grep confirms both the tool mention and the reference rule (second grep must FAIL to match violations… see verify)

Scenario: Writing rules for @cc present
  Test: bash -c 'grep -A15 "Applicable contracts" templates/CONTRACT-FORMAT.md | grep -q "adr:" && grep -A15 "Applicable contracts" templates/CONTRACT-FORMAT.md | grep -qi "stable"'
  Given the writing-rules block
  When read
  Then stable-ID and adr:-attribute rules both appear in the section (window A15: content lives at ~lines 48-61; the section's prose spacing exceeds A6)

Scenario: Plan skill Phase 5 line
  Test: grep -q "Applicable contracts" skills/plan/SKILL.md
  Given skills/plan/SKILL.md Phase 5 text
  When the edit lands
  Then contract generation instructions mention populating the section when repo contracts exist

Scenario: Negative — no second boundary authority
  Test: bash -c '[ "$(grep -c "### Allowed Changes" templates/CONTRACT-FORMAT.md)" = "2" ]'
  Given the template's structure (base 1ad5d2df carries TWO occurrences: template body + worked example — verified pre-existing)
  When the edit lands
  Then the count stays exactly 2 — Applicable contracts grew no boundary-like list of its own; drift above 2 is the regression signal
