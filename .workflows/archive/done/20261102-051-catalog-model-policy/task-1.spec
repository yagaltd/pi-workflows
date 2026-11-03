spec: task
name: catalog-model-scanner
tags: [models, scanner, tdd]
verify: "bun test tests/models-scan.test.ts && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

Model policy resolution becomes catalog-driven: a pure resolver consumes pi's live model-catalog snapshot (subagent_models shape) alongside the existing OpenRouter fixture, prefers NATIVE provider ids over aggregator ids for the same family, and produces a per-tier shortlist (strong/standard/scout/vision) with provenance for the /init human gate.

## Decisions

- New fixture `fixtures/pi-catalog.json` — snapshot of the subagent_models output shape (array of { model: "provider/id", contextWindow, thinkingLevels, price?, ... } — capture the real shape today).
- Native-preference rule: when the same model family is offered by BOTH a native provider (direct prefix: zai/, openai/, google/, anthropic/, …) and an aggregator (openrouter/…), the NATIVE id wins.
- Tier shortlist: strong = highest context window reasoning-capable candidate; standard/scout = fast/cheap candidate from the SAME provider as strong (pairing stability); vision = vision-capable candidate if any (else role unresolved → legacy WARN path).
- Provenance: every resolved role records `source: "pi-catalog"` (+ provider); OpenRouter-only roles keep `openrouter-live`.
- Existing OpenRouter fixture pins stay green — OpenRouter remains source #2, not deleted.
- Pure function (fixture-in, policy-out) — no network in tests.

## Boundaries

### Allowed Changes
- tests/models-scan.test.ts
- fixtures/pi-catalog.json (new)

### Forbidden
- Do not modify models/registry.json generation targets outside the test, prompts/, agents/, skills/, scripts/
- No network calls in tests (fixtures only)

## Completion Criteria

Scenario: native-preferred resolution
  Test: native provider wins over aggregator for the same family
  Given a pi-catalog fixture containing a native provider id and an openrouter id for the same family (e.g. glm-5.3)
  When resolveModelPolicy runs
  Then the tier shortlist uses the native id and provenance reads pi-catalog

Scenario: strong tier picks highest-context reasoning candidate
  Test: strong tier ordering
  Given catalog candidates with differing context windows
  When resolveModelPolicy runs
  Then strong = the highest-context reasoning-capable candidate; provenance present

Scenario: standard pairs with strong's provider
  Test: standard/scout same-provider pairing
  Given the strong pick's provider also offers a fast/cheap candidate
  When resolveModelPolicy runs
  Then standard/scout resolve to that same-provider candidate

Scenario: openrouter-only roles keep legacy source
  Test: openrouter source preserved
  Given a role resolvable only via the OpenRouter fixture
  When resolveModelPolicy runs
  Then provenance stays openrouter-live and existing pins stay green

Scenario: vision falls to legacy path when absent
  Test: vision unresolved without vision-capable candidate
  Given no vision-capable candidate in the catalog
  When resolveModelPolicy runs
  Then vision is unresolved (legacy WARN path), not fabricated
