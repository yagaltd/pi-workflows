spec: task
name: pi-workflows-mise-self-pin
tags: [mise, self-pin, tdd]
verify: "bun test tests/mise-pin.test.ts && mise exec -- bun --version"
max-rounds: 3
---

## Intent

pi-workflows self-pins its toolchain: `mise.toml` at repo root pinning bun + node to the exact current machine versions — drift-immunity for the repo that teaches the pattern.

## Decisions

- `[tools]`: bun = "1.3.11" (current), node = "25.8.0" (current mise node). Exact pins — no behavior change on this machine; other machines/CI get identical versions via `mise install`.
- Minimal file: tools only (no env/tasks yet — those are future needs, subtract-first).
- Tracked file at repo root (mise.toml is a root file — committed for collaborators + CI).
- Pin test: tests/mise-pin.test.ts — mise.toml exists, contains both pins.

## Boundaries

### Allowed Changes
- mise.toml (new, repo root)
- tests/mise-pin.test.ts (new)

### Forbidden
- Do not modify package.json, justfile, agents/, skills/, prompts/, tests/prompt-doctrine.test.ts
- Do not run mise upgrades of global tools

## Completion Criteria

Scenario: mise.toml pins the toolchain
  Test: pins present
  Given mise.toml at repo root
  When the pin test reads it
  Then bun = "1.3.11" and node = "25.8.0" are declared

Scenario: mise exec resolves pinned versions
  Test: live resolution
  Given the file committed state
  When `mise exec -- bun --version` runs
  Then it prints 1.3.11.x and the full suite passes under it
