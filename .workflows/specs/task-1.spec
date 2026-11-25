spec: task
name: "judge-context-binding"
tags: [judge, context, evidence]
verify: "bun test tests/judge.test.ts"
max-rounds: 2
---

## Intent

Bind judge pre-flight questions to the contract text they ask about. A path alone is not evidence; oversized or unsafe context must fail closed before any network call.

## Decisions

- One contract per call; repeatable `--context` paths are concatenated into every question and caps are measured on the final translated payload.
- Context accepts regular UTF-8 spec files under the spec directory only; symlinks, other paths, non-UTF-8 content, and key-shaped names are rejected.
- A cap breach emits a loud skip, writes `truncated: true` in the audit entry, and sends nothing.
- The existing key chain, loud-skip behavior, question cap, and answer mapping remain unchanged.
- The accepted yes/no schema and advisory-judge doctrine are not changed by this task.

## Boundaries

### Allowed Changes
- .workflows/specs/task-1.spec
- scripts/judge.mjs
- tests/judge.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- scripts/check-judge-context.mjs
- scripts/wf.sh
- scripts/init-extract.ts
- skills/**
- docs/**
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: context binds contract text into the outgoing question payload
  Test: test_context_binds_spec_text
  Given a judge question set and a supplied spec context
  When the judge request body is built
  Then every question instruction contains the supplied contract text before its original question
  And no path-only instruction remains

Scenario: context rejection is strict
  Test: test_context_rejects_invalid_files
  Given context candidates that are symlinks, non-UTF-8, outside the spec directory, or key-shaped
  When the command validates context
  Then each candidate is rejected loudly
  And no request is sent

Scenario: cap breach fails closed
  Test: test_context_caps_fail_closed
  Given context that exceeds the per-question cap or the final payload cap
  When the command runs
  Then it emits a loud skip naming the cap breach
  And the audit entry records truncated true
  And no network request is made

Scenario: existing yes/no and skip behavior is preserved
  Test: test_context_preserves_judge_contract
  Given yes/no questions and a missing judge key
  When the judge command runs with and without context
  Then translation, answer mapping, and loud skip remain byte-compatible with the current contract

Scenario: mock backend proves binding without network
  Test: test_context_mock_backend_payload
  Given a mock fetch backend and a context-bound question set
  When ask runs
  Then the captured request contains the contract text in every instruction
  And the audit records the context paths without secrets
