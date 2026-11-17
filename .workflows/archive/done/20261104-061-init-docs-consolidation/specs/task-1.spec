spec: task
name: domain-skill-wiring
tags: [doctrine, reviewer, skills, tdd]
verify: "bun test tests/prompt-doctrine.test.ts && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

Generalize domain-skill wiring: reviewer.md's Rust-only Domain-skills rule becomes stack/area-general (Rust family, modern-web-guidance, cloudflare workers + security audit, impeccable/audit, harden — consulted-note duty kept); /init step 1 cites stack-detected families (greenfield pre-detection skips cleanly); /plan contracts gain an optional Skills: line; /idea notes domain skills + capability gaps as ledger research items (API services → MCP servers; find-skills stays owner-invoked). Pinned by T13.

## Decisions

- Implicit auto-trigger already exists everywhere — wiring = discipline lines, not machinery (subtract-first).
- Online discovery is owner-invoked only (supply-chain consent); API access is MCP's job, not skills'.

## Boundaries

### Allowed Changes
- agents/reviewer.md
- skills/init/SKILL.md
- skills/plan/SKILL.md
- skills/idea/SKILL.md
- tests/prompt-doctrine.test.ts

### Forbidden
- scripts/, prompts/, templates/, README.md, AGENTS.md, other agents files, other skills

## Completion Criteria

Scenario: reviewer rule generalized
  Test: T13 pin reads reviewer.md
  Given the edit
  When pinned
  Then the rule names stack/area-matched families (Rust family, modern-web-guidance, cloudflare workers + security audit, impeccable/audit, harden) and keeps the consulted-note duty

Scenario: init cites stack-detected families
  Test: T13 pin reads init step 1
  Given the edit
  When pinned
  Then the charter cites the detected stack's installed family and skips cleanly before stack detection (greenfield)

Scenario: plan contracts cite skills
  Test: T13 pin reads plan skill
  Given the edit
  When pinned
  Then contracts carry an optional Skills: line citing relevant domain skills

Scenario: idea gap note
  Test: T13 pin reads idea skill
  Given the edit
  When pinned
  Then domain-skill consideration + capability-gaps-as-research-items + find-skills owner-invoked + MCP-over-skills for API services are present

Scenario: all prior pins survive
  Test: full suite
  Given the edits
  When bun test runs
  Then 0 fail (T6/T7/T8/T9/T10/T11/T12 + plan-050 pins intact)
