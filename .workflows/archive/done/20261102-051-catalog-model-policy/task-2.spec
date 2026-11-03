spec: task
name: init-model-policy-step
tags: [init, doctrine, tdd]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

/init Phase 5 gains a Model policy step (step 7, after the charter probe): query the live pi model catalog (subagent_models tool surface), present the per-tier shortlist (strong/standard/scout/vision, native-preferred, with provenance) at the HUMAN GATE, write the owner's pick to models/registry.json with provenance `pi-catalog`, and hand off. agents/registry.md's Model resolution section gains the catalog-first order.

## Decisions

- /init SUGGESTS — the human gate picks (charter-probe pattern). No silent auto-selection.
- Resolution order documented in agents/registry.md: **live pi catalog (native-preferred) → models/registry.json → legacy constants (WARN, never silent)**. Legacy deepseek constants remain as marked fallbacks, unchanged.
- SKILL wording names the tool surface (subagent_models / pi model catalog) and the never-key-files rule (catalog = capability; keys = secrets).
- Handoff step (7→8 renumber, charter-probe pattern) references the model-policy outcome.
- Pin tests: new describes in tests/prompt-doctrine.test.ts (T1 scanner pins live in tests/models-scan.test.ts).

## Boundaries

### Allowed Changes
- skills/init/SKILL.md
- agents/registry.md (Model resolution section only)
- tests/prompt-doctrine.test.ts (extend)

### Forbidden
- Do not modify tests/models-scan.test.ts (T1's file), models/registry.json, templates/, AGENTS.md
- Do not change the tier table aliases (@model:strong/standard/vision pins in extension.test.ts are alias-level and must stay green)

## Completion Criteria

Scenario: model-policy step documented
  Test: init model-policy step pinned
  Given skills/init/SKILL.md after the edit
  When the pin test reads it
  Then step 7 "Model policy" exists: live catalog query, tier shortlist, human gate, models/registry.json write with pi-catalog provenance

Scenario: registry resolution order pinned
  Test: catalog-first resolution order pinned
  Given agents/registry.md Model resolution section
  When the pin test reads it
  Then the order live-catalog → registry.json → legacy-constants-WARN is present, and legacy constants remain marked fallbacks

Scenario: no-key-scanning rule pinned
  Test: capability-not-secrets rule pinned
  Given skills/init/SKILL.md
  When the pin test reads it
  Then the step states catalog-only (never key files/contents)

Scenario: existing pins stay green
  Test: extension.test.ts + proof-docs.test.ts green
  Given the edited files
  When the full suite runs
  Then alias-level tier pins and verify.md pins pass unchanged
