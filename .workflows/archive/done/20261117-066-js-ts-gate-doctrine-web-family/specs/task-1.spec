spec: task
name: js-ts-gates-and-web-family
tags: [doctrine, js, typescript, skills]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

A vanilla-JS project must get the same real gates a Rust or bun/TS project gets, and a
UI diff must consult the web skill family the machine actually has — not two of twenty,
and never a skill that does not exist.

## Decisions

- The gate source is the project's own tooling: `eslint` or `biome` for `check`,
  `vitest` | `node --test` | `bun test` for `verify`. No linter detected → say so and
  leave `check` absent rather than inventing one.
- The reviewer names `modern-web-guidance` first for any client-side diff, `web-perf`
  for CWV-sensitive work, and the impeccable set by intent, one verb at a time.
- Doctrine names must exist: the reviewer cites the installed Rust trio
  (`rust-review`, `rust-best-practices`, `rust-port`); `unsafe-checker` is removed.

## Boundaries

### Allowed Changes
- skills/init/SKILL.md
- agents/reviewer.md
- tests/prompt-doctrine.test.ts
- docs/architecture.md

### Forbidden
- Any other skill, agent, prompt, extension or script
- Adding a linter or test runner to this repo's own gates
- Naming a skill that is not installed (the pin enforces this with a fixed list)

## Completion Criteria

Scenario: a vanilla-JS project gets gates from its own linter and runner
  Test: test_init_names_js_linters_and_a_vanilla_example
  Given skills/init/SKILL.md
  When it is read
  Then it names `eslint` and `biome` as check sources and `vitest`/`node --test`/`bun test` as verify sources
  And it carries a worked vanilla-JS example beside the bun/TS and rust ones
  And the "never placeholder filler" rule still holds

Scenario: the existing bun/TS and rust examples survive
  Test: test_init_keeps_existing_stack_examples
  Given the same file
  When it is read
  Then it still names `tsc --noEmit` for bun/TS and `cargo clippy`/`cargo test` for rust

Scenario: the reviewer names the whole web family by intent
  Test: test_reviewer_names_web_family
  Given agents/reviewer.md
  When it is read
  Then it names `modern-web-guidance` and `web-perf`
  And it names the impeccable set by intent (audit, harden, distill, normalize, polish)

Scenario: no doctrine line names a skill that does not exist
  Test: test_reviewer_names_only_installed_skills
  Given the skill names cited in agents/reviewer.md
  When compared against the installed set of record
  Then every name resolves, and `unsafe-checker` appears nowhere
  And the Rust trio reads rust-review, rust-best-practices, rust-port

Scenario: the repo's own gates stay green
  Test: test_gates_stay_green
  Given the two doctrine files changed
  When `bash scripts/check-drift.sh` runs
  Then it is CLEAN and the suite is green
