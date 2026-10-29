spec: task
name: "metric-gates-script"
tags: []
---

## Intent

Land the metric gates: (1) `scripts/metric-gates.sh [--with-mutation]` — complexity + duplication checks always (tools: crapper, dryer), mutation (mutator) only with the flag; tool absent ⇒ `skip:` line, no failure; tool present ⇒ run + compare thresholds ⇒ `FAIL:` per violation, non-zero exit only on violations; (2) optional `metrics` block in `.workflows/profile.json` (`crap_max`, `duplication_max`, `paths`) with profile-lint numeric/path validation; (3) check-drift section 10 runs the cheap tier (no mutation flag) with FAIL accounting.

## Decisions

- Graceful-skip contract (docs-lint pattern): absent tool ⇒ `skip: <gate> — <tool> not installed` line; skips never increment FAIL.
- Thresholds: profile `metrics.crap_max` (default 10), `metrics.duplication_max` (default 0.8); paths default to the profile's `tree` paths. Tool invocation: `crapper <path>` / `dryer <path>` / `mutator <path>` (the tools' own CLI), from the repo root.
- Mutation tier: `--with-mutation` only; the drift gate never runs it (cost).
- profile-lint extension: `metrics` values must be numeric (crap_max ≥ 1, 0 < duplication_max ≤ 1), `metrics.paths` must exist. Absent `metrics` block stays legal (defaults apply).
- Repo profile gains the metrics block with defaults (crap_max 10, duplication_max 0.8, paths extensions + scripts).
- Tool detection: `command -v crapper` / `dryer` / `mutator`.

## Boundaries

### Allowed Changes
- scripts/metric-gates.sh
- .workflows/profile.json
- scripts/profile-lint.sh
- scripts/check-drift.sh

### Forbidden
- Do not touch `skills/**`, `extensions/**`, `AGENTS.md`, `templates/**`, README/CHANGELOG/package.json (TASK 2 scope), `.workflows/decisions/*`.
- Do not modify check-drift sections 1–9 — add section 10 only.

## Completion Criteria

Scenario: gate skips cleanly when tools are absent
  Test: bash scripts/metric-gates.sh > /tmp/p44-skip.txt 2>&1; test $? -eq 0 && test $(grep -c 'skip:' /tmp/p44-skip.txt) -ge 2
  Given this machine without crapper/dryer installed
  When metric-gates runs without the mutation flag
  Then it exits 0 with at least two skip lines (complexity, duplication)

Scenario: planted violation fails the gate
  Test: mkdir -p /tmp/p44-fake && printf '#!/bin/bash\necho "function foo crap 42"\n' > /tmp/p44-fake/crapper && chmod +x /tmp/p44-fake/crapper && cp .workflows/profile.json /tmp/p44-metrics.json && python3 -c "import json;p=json.load(open('.workflows/profile.json'));p['metrics']={'crap_max':10,'duplication_max':0.8,'paths':['extensions']};json.dump(p,open('/tmp/p44-metrics.json','w'))"; PATH=/tmp/p44-fake:$PATH bash scripts/metric-gates.sh --profile /tmp/p44-metrics.json > /tmp/p44-violation.txt 2>&1; if [ $? -eq 0 ]; then exit 1; fi; grep -q "FAIL:" /tmp/p44-violation.txt
  Given a PATH-scoped fake crapper reporting crap 42 and a profile capping crap at 10
  When metric-gates runs against them
  Then it exits non-zero with a FAIL line

Scenario: profile lint rejects non-numeric metrics
  Test: cp .workflows/profile.json /tmp/p44-bad.json && python3 -c "import json;p=json.load(open('.workflows/profile.json'));p['metrics']={'crap_max':'ten'};json.dump(p,open('/tmp/p44-bad.json','w'))"; if bash scripts/profile-lint.sh /tmp/p44-bad.json; then exit 1; fi
  Given a profile copy with a non-numeric crap_max
  When profile-lint runs on it
  Then it exits non-zero

Scenario: drift section runs the gate
  Test: bash scripts/check-drift.sh 2>&1 | grep -q "metric-gates"
  Given check-drift after the change
  When it runs
  Then section 10 invokes metric-gates and appears in the output

Scenario: mutation stays out of the default run
  Test: bash scripts/metric-gates.sh 2>&1 | grep -qviE 'mutator' && bash scripts/metric-gates.sh --with-mutation 2>&1 | grep -q 'mutator'
  Given the two invocation modes
  When each runs
  Then the default run never mentions mutator and the flag run does
