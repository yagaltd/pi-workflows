spec: task
name: "Model registry scan script + seeded registry"
tags: [models, registry, pricing, openrouter, tooling]
max-rounds: 2
---

## Intent

Kill hardcoded model ids: a zero-dep resolver that scans live pricing, resolves preference
slots to concrete provider/model ids, and writes the user-editable registry. Offline-safe,
deterministic under --fixture for tests.

## Decisions

- D1+D2 (plan 20260822-004): `scripts/models-scan.mjs` (Node ≥18, zero deps, ESM) +
  `models/registry.json` seeded by a REAL live scan at implementation time.
- Registry shape (exact keys): `{ "$schema"?: string, "prefs": { "families": string[], "providers": string[] }, "roles": { "standard"|"strong"|"reviewer"|"scout": { "id": string, "provider": string, "seen": { "inPerM": number, "outPerM": number, "ctx": number }, "source": "openrouter-live"|"deepseek-docs", "resolvedAt": string } } }`.
- Family matching: a pref like `deepseek-flash` matches OpenRouter ids matching
  `deepseek.*v4-flash.*` (family → regex table in-script); **newest build wins** (version suffix
  sort: `v4-flash-0731` > `v4-flash`; dated suffix > undated alias).
- Provider order from prefs: `deepseek-api` first when resolvable from docs constants,
  `openrouter` as live-priced fallback. DeepSeek official has NO pricing API — constants
  in-script, `source: "deepseek-docs"`.
- Offline/fetch-failure: keep previous role resolutions verbatim, print WARN, exit 1. Never
  write an empty/partial registry (atomic write: temp file + rename).
- `--fixture <path>`: read models JSON from file instead of network — same resolution path,
  same output shape; used by tests. `--dry-run`: print, don't write.

## Boundaries

### Allowed Changes
- scripts/models-scan.mjs (new)
- models/registry.json (new, seeded by live scan)
- tests/models-scan.test.ts or tests/models-scan.test.mjs (new — match repo's existing runner)

### Forbidden
- agents/**, README.md, .workflows/**, extensions/**, prompts/**, package.json (no new deps — zero-dep requirement), templates/**

## Completion Criteria

Scenario: Live scan resolves all roles
  Test: node scripts/models-scan.mjs && node -e "const r=require('./models/registry.json'); console.log(Object.keys(r.roles).length)"
  Then exit 0; 4 roles present, each with id/provider/seen/source/resolvedAt; deepseek roles resolve to v4-era builds

Scenario: Newest build wins
  Test: run with a fixture containing v4-flash AND v4-flash-0731
  Then the role resolves to v4-flash-0731 (dated suffix beats undated alias)

Scenario: Offline keeps previous
  Test: corrupt the fetch (unreachable URL via env/flag or empty fixture dir), registry pre-seeded
  Then exit 1, WARN printed, models/registry.json byte-identical to before (no wipe, no partial)

Scenario: Atomic write
  Test: fixture resolution producing output, then interrupted write simulation (script-internal: write temp + rename)
  Then registry never contains partial JSON at any observable moment (test asserts rename path used, e.g. via fixture FS spy or code-structure grep)

Scenario: Zero deps
  Test: grep -E "from ['\"]|require\(" scripts/models-scan.mjs
  Then only node: builtins (node:fs, node:path, etc.) — no npm imports

Scenario: Fixture-deterministic test run
  Test: repo test runner (adapt to existing: npm test / node --test tests/)
  Then scan tests pass offline using --fixture; suite green
