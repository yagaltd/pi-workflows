spec: task
name: "Registry → dispatch policy integration"
tags: [registry, dispatch, models, policy]
max-rounds: 2
---

## Intent

Wire the model registry into the dispatch policy: bottleneck table speaks `@model:<role>`,
resolution contract defined, reviewer toolset marked non-optional. After this, no dispatch
doc needs a raw model id.

## Decisions

- D3 (plan 20260822-004): `agents/registry.md` model-policy section — bottleneck table model
  column becomes refs: 🔴 BLOCKING → `@model:strong`, 🟡 RISKY → `@model:strong`, 🔵/🟠/⚪ →
  `@model:standard`, reviewer tasks → `@model:reviewer`, scout → `@model:scout`.
- New "Model resolution" subsection (same file, after the table): orchestrator resolves
  `@model:<role>` from `models/registry.json` at dispatch time; unresolvable role/missing
  registry → **loud fallback**: pick explicit legacy id (`deepseek/deepseek-v4-pro` for strong,
  `-flash` for the rest), print a WARN line naming the role and the fallback — never silent.
- Reviewer row in the Roles table: toolset cell gains "**bash non-optional** — dispatching a
  reviewer without bash is a dispatch bug; the role itself VOIDs mechanical layers without it
  (see agents/reviewer.md)".
- `agents/dispatch-shapes.md`: the `model:` field documentation accepts `@model:<role>` syntax
  (resolve-or-loud-fallback, same semantics). Keep every other shape field untouched.

## Boundaries

### Allowed Changes
- agents/registry.md
- agents/dispatch-shapes.md

### Forbidden
- agents/reviewer.md, agents/worker.md (T3's), scripts/**, models/**, tests/**, README.md, .workflows/**, extensions/**, templates/**, prompts/**

## Completion Criteria

Scenario: Bottleneck table fully referenced
  Test: grep -c "@model:" agents/registry.md
  Then ≥5 occurrences covering all four roles (strong/standard/reviewer/scout)

Scenario: No raw model ids left in policy tables
  Test: grep -nE "deepseek|anthropic|openai|google" agents/registry.md
  Then matches only inside the loud-fallback legacy-id examples (explicitly marked as fallback constants), none driving the policy table

Scenario: Resolution contract present
  Test: grep -n "loud fallback\|never silent" agents/registry.md
  Then the resolution paragraph exists with the fallback rule and WARN requirement

Scenario: Reviewer toolset non-optional
  Test: grep -n "non-optional" agents/registry.md
  Then present in the reviewer Roles row, pointing at the reviewer.md VOID tripwire

Scenario: dispatch-shapes accepts role refs
  Test: grep -n "@model:" agents/dispatch-shapes.md
  Then the model field documents `@model:<role>` with resolve-or-fallback semantics

Scenario: Role files untouched
  Test: git diff --name-only
  Then only agents/registry.md and agents/dispatch-shapes.md changed
