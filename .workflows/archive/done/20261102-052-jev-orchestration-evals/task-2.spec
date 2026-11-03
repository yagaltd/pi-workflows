spec: task
name: eval-wiring-doctrine
tags: [evals, kaizen, doctrine, tdd]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

Wire the eval core into the workflow: `just eval` recipe, committed-scores whitelist, and the kaizen trigger policy documented in execution doctrine.

## Decisions

- justfile: `eval` recipe → `node scripts/eval-orchestration.mjs` (standalone; NOT added to ci — judge calls cost cents and ci stays key-free).
- .gitignore: whitelist `.workflows/evals/` (per-version scores are committed data — comparison across versions requires it).
- agents/execution-doctrine.md: new section "Eval kaizen triggers" — the two modes (daily-kaizen: single-dimension isolated breach → immediate small fix; kaizen-event: 2-consecutive or multi-dimension or >10% overall drop → corrective plan) + the autonomy boundary (measurement autonomous; human approves triggered plans).
- tests/prompt-doctrine.test.ts: T4 describe pinning the doctrine wording.

## Boundaries

### Allowed Changes
- justfile (eval recipe)
- .gitignore (whitelist line)
- agents/execution-doctrine.md (new section)
- tests/prompt-doctrine.test.ts (extend)

### Forbidden
- Do not modify scripts/eval-orchestration.mjs, scripts/judge.mjs, fixtures/, agents/registry.md, agents/worker.md, agents/reviewer.md
- Do not add eval to the ci recipe

## Completion Criteria

Scenario: eval recipe exists
  Test: justfile eval recipe pinned
  Given the justfile after the edit
  When the pin test reads it
  Then the eval recipe invokes scripts/eval-orchestration.mjs and is absent from the ci recipe

Scenario: scores whitelisted
  Test: gitignore whitelist pinned
  Given .gitignore after the edit
  When the pin test reads it
  Then .workflows/evals/ is whitelisted and a tracked-file check passes (git check-ignore exits non-zero for .workflows/evals/orchestration/history.jsonl)

Scenario: kaizen triggers documented
  Test: doctrine kaizen section pinned
  Given agents/execution-doctrine.md
  When the pin test reads it
  Then both trigger modes + the autonomy boundary are documented

Scenario: existing pins stay green
  Test: full suite green
  Given all edits
  When bun test runs
  Then 0 fail (prompt-doctrine + all prior pins intact)
