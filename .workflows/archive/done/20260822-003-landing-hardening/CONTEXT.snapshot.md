# Domain Memory — pi-workflows

## Glossary
- **abort-as-failure-signal**: when a needs-gated reviewer node auto-aborts (upstream worker failed/blocked), no verdict exists; the orchestrator treats the abort itself as the failure signal and inspects the worker output directly.
- **verification policy**: registry table mapping task traits (docs / standard / security-concurrency-parsing-external-input) to reviewer model+thinking; scales reviewer cost, never its existence.

## Decisions
- Sequential verification is engine-enforced: one two-node graph (worker → reviewer needs edge); conditionality (fix rounds, re-reviews) stays with the orchestrator as follow-up dispatches; re-review rounds are standalone (no needs).

## Decisions (2026-08-21, plan 20260821-001)
- Tier system verified live: complexity scales reviewer cost (docs=low, standard=med-high, security/concurrency/parsing/external-input=xhigh+strongest model), never verdict existence.
- Quality-reviewer: per-task tag-gated (🔴/🟡/🟠) standalone follow-up after ok:true; never per-wave; /review = whole-plan gate.
- Orchestrator lesson: subagent dispatches to scratch/external repos MUST set per-task cwd — recorded after 2 live mis-dispatches caught by the gates.

## Decisions (2026-08-21, review round)
- Shell-gate rule: never call err()/FAIL-mutating helpers inside `cmd | while read` pipelines (subshell loses state) — process substitution `< <(cmd)` is the pattern; every new checker section must be red-tested with an injected violation.
- Prompts/CHANGELOG claims must be written against the artifact (byte counts, test counts), not the intention — reviewer falsified three.
- next.md is the single @role:-dialect entry point: sequential shape inline + routing to registry/execution-doctrine/dispatch-shapes; any new dispatch dialect is drift by definition.

### Decisions (2026-08-22, plan 20260822-003)
- Per-task cwd mandatory (GUARD step 0): enforced — worker step 0 verifies `pwd` matches `git rev-parse --show-toplevel` before any read/write. The 2026-08-21 advisory "MUST set per-task cwd" note is hereby superseded-by-enforcement (proven: run-level cwd 3/10 successful vs per-task+GUARD 13/13 successful across 20260822-002 incident).
- Anti-scaffold rule: workers NEVER scaffold files to make a missing contract runnable — report WORKER_BLOCKER instead.
- VOID semantics for zero-change/inapplicable reviews: reviewer returns VOID verdict with provenance (spec+path+reason), never a fake ok:true.
- `tooling/verify-landing.sh` tripwire: runs after reviewer `ok:true`, before verdict persist; ALARM → phantom → redispatch.
