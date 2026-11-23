# Contract — plan 076 Phase 1: TypeLLM client + intake triage at ship
## Goal
TypeLLM client module (env-side key, schema-driven, loud-skip) + intake triage of worker findings at ship (queued/batched/closed/done) + measurement harness + doctrine line.
## Allowed Changes
extensions/index.ts, src/** (new client module), tests/**, skills/review/SKILL.md, scripts/bench-intake-triage.*, .workflows/specs/**
## Forbidden
README.md key content (074 pin), agents/reviewer.md (Phase 2), vendor dirs, deps additions (fetch is native)
## Verify
1. RED: client + triage tests fail pre-implementation. 2. GREEN: bun test exit 0 full suite. 3. check-drift CLEAN. 4. docs-lint CLEAN. 5. Harness runs on fixtures and reports accuracy. 6. Loud-skip proven: no-key path exercised in tests.
