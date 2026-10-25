spec: task
name: "judge-client"
tags: []
---

## Intent

Add `scripts/judge.mjs` — the repository's single judge client. It posts a typed question set to the TypeLLM `/v1/generate` API and returns a fixed-size verdict table. Configuration is env-only (`TYPEDLLM_API_KEY`, `TYPEDLLM_BASE_URL`); there is NO key on this machine, so key-absence degradation is the tested default path: loud skip, exit 0, never a fabricated verdict. No SDK dependency — plain fetch, node ≥ 20.

## Decisions

- CLI: `node scripts/judge.mjs ask --questions <file.json> --audit <file>` — questions file = JSON array of `{id, question, schema}` objects (schema = per-question JSON Schema for the answer).
- The client enforces the 64-question cap locally: a larger set exits non-zero with an error naming the count — it is never sent.
- Success: verdict JSON printed to stdout AND the audit file appended with one line: timestamp, question count, verdict summary. Transport: POST `{TYPEDLLM_BASE_URL:-https://api.typellm.ai}/v1/generate`, `Authorization: Bearer <key>`, 30 s timeout.
- Degradation: missing `TYPEDLLM_API_KEY` or unreachable endpoint ⇒ stderr line `JUDGE SKIPPED (<reason>)`, audit entry `skipped`, exit 0. Never blocks, never invents answers.
- House script style: `set -u`-equivalent strictness in JS, resolves its own repo root for defaults, matches scripts/dispatch-ledger.mjs conventions (node ≥ 20, no deps).

## Boundaries

### Allowed Changes
- scripts/judge.mjs
- tests/judge.test.ts

### Forbidden
- Do not touch `extensions/**`, `prompts/**` (TASK 2/TASK 3 scope), `agents/**` (TASK 2 scope), README, CHANGELOG (TASK 4 scope).
- Do not add dependencies (fetch is builtin; the stub server uses node:http).

## Completion Criteria

Scenario: sends typed questions to the generate endpoint
  Test: sends typed questions to the generate endpoint
  Given a stub HTTP server asserting the request path, method, and auth header
  When the client runs with a 2-question set and a valid key
  Then the request hits /v1/generate with the question array and Bearer header
  And the verdict JSON is printed to stdout

Scenario: rejects question sets over the 64 cap
  Test: rejects question sets over the 64 cap
  Given a 65-question set
  When the client starts
  Then it exits non-zero locally with an error naming the count
  And no HTTP request is made

Scenario: skips loudly when the key is missing
  Test: skips loudly when the key is missing
  Given TYPEDLLM_API_KEY unset
  When the client runs
  Then it exits 0
  And stderr contains JUDGE SKIPPED
  And the audit file gains a skipped entry

Scenario: skips loudly when the endpoint is unreachable
  Test: skips loudly when the endpoint is unreachable
  Given TYPEDLLM_BASE_URL pointing at a closed port
  When the client runs
  Then it exits 0
  And stderr contains JUDGE SKIPPED

Scenario: appends the question set and verdict to the audit file
  Test: appends the question set and verdict to the audit file
  Given a successful call against the stub server
  When the run completes
  Then the audit file contains one line per run with timestamp, question count, and verdict summary
