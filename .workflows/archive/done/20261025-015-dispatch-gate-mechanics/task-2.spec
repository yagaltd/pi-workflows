spec: task
name: "ledger-cache-fields"
tags: []
---

## Intent

`scripts/dispatch-ledger.mjs` records provider cache tokens per subagent when the provider usage carries them: `cacheReadTokens` and `cacheCreationTokens` (null when absent). The `report` command gains a `cache_read/input` ratio column so plan 015's cache-affinity ordering is measured, not assumed. Null-safe: providers that expose no cache fields print `n/a`, never fake numbers.

## Decisions

- Read cache fields from the same usage records already parsed (`inputTokens`/`outputTokens`/`reasoningTokens` neighbors); tolerate snake_case and camelCase provider shapes.
- Report column: `cache%` = sum(cacheReadTokens) / sum(inputTokens) per model × thinking group; `n/a` when the denominator group has no cache data.
- No format changes to existing columns; no new dependencies.

## Boundaries

### Allowed Changes
- scripts/dispatch-ledger.mjs
- tests/dispatch-ledger.test.ts

### Forbidden
- Do not touch `extensions/index.ts` (TASK 1/TASK 3 scope).
- Do not change the ledger JSONL file format beyond additive fields.

## Completion Criteria

Scenario: records cache tokens when present
  Test: records cache tokens when present
  Given a session JSONL whose usage carries cacheReadTokens and cacheCreationTokens
  When scan runs
  Then the ledger row carries both fields with the parsed values

Scenario: prints n/a when provider omits cache fields
  Test: prints n a when provider omits cache fields
  Given ledger rows without cache fields
  When report runs
  Then the cache% column prints n a for those groups
  And no group invents a zero ratio

Scenario: report gains cache ratio column
  Test: report gains cache read over input column
  Given ledger rows with cache data across two model groups
  When report runs
  Then the output contains a cache% column
  And each group row shows its own ratio
