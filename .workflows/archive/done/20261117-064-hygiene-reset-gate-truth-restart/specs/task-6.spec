spec: task
name: docs-lint-tools
tags: [gate, docs, tooling]
verify: "bash scripts/docs-lint.sh && bun test"
max-rounds: 3
---

## Intent

`scripts/docs-lint.sh` declares seven sections; three of them (markdownlint-cli2, lychee, harper-cli) skip on this machine because the tools are absent, and the script still prints CLEAN. Absent tools are supposed to warn, never to look like a pass. All three are available in the mise registry, so the gap is three pins, not a redesign.

## Decisions

- Pin `markdownlint-cli2 = "0.24.1"`, `lychee = "0.24.2"`, `harper-cli = "3.2.0"` in mise.toml [tools] (project-local: they are documentation gates for this repo, not global tools).
- Size before fixing: capture the finding count per section first, then triage. Structure and link findings get fixed; prose findings may stay advisory via `DOCS_LINT_HARPER_ADVISORY=1` with the residual count recorded in the task report.
- The script keeps its skip-with-a-warning behaviour for a genuinely unavailable tool; what may not return is a skipped section reported as a clean pass.
- **Ratchet, not absolute zero** (owner-approved 20261117): the measured debt is 1008 markdownlint + 1325 harper findings and 2 lychee errors, 947 of them in paths this task may not touch. An absolute gate would leave `just ci` permanently red and get bypassed. So a committed per-file baseline becomes the finding budget: a NEW file or an INCREASED count fails; anything at or below baseline passes, with the residual total printed on every run and regenerable via a `--write-baseline` flag. Paying the debt down is a separate plan.
- **Anti-bot 403 is never debt** (found by the round-2 reviewer, measured 0/1/0 across three runs): a documented host list (currently `www.npmjs.com`) blocks non-browser clients, so a 403 from it is not evidence of a broken link. The lychee section drops such an entry deterministically, prints the drop so it is visible, and keeps counting everything else. A real 404/5xx still fails. Attempt retries are not a substitute for a rule — the 403 is sticky within a run.
- A tool that exists but cannot execute (e.g. a mise shim without a pinned version, `mise ERROR No version is set for shim`) is `failed: tool unusable` — never findings, never a skip.

## Boundaries

### Allowed Changes
- mise.toml
- scripts/docs-lint.sh
- scripts/docs-lint-baseline.json (new: the committed finding budget)
- docs/** (except docs/architecture.md)

### Forbidden
- README.md, CHANGELOG.md, AGENTS.md (orchestrator's SHIP step)
- prompts/, skills/, agents/, extensions/, tests/
- Disabling a section outright or removing a check from the script

## Completion Criteria

Scenario: the three sections run instead of skipping
  Test: docs-lint reports sections 1-3 as ran
  Given the pinned tools
  When `bash scripts/docs-lint.sh` runs
  Then sections 1, 2 and 3 report ran or findings, never skip

Scenario: the summary distinguishes ran, skipped and failed
  Test: summary block lists the sections by outcome
  Given a run with all three tools installed
  When the summary prints
  Then it lists the sections under ran, and skipped appears only if a tool is genuinely missing

Scenario: findings are triaged, not hidden
  Test: residual counts recorded, fixes applied
  Given the first run with the tools present
  When findings appear
  Then structure and link findings are fixed in the allowed paths
  And any remaining prose findings are recorded with counts and the advisory flag in use

Scenario: known debt is ratcheted, new debt is blocked
  Test: baseline compare fails only on new or increased findings
  Given a committed per-file baseline
  When a run produces the same or fewer findings per file
  Then it passes and prints the residual total
  And when one file gains a finding (or a new file appears), it fails naming that file

Scenario: the baseline is reproducible, not hand-edited
  Test: --write-baseline regenerates the committed budget
  Given the current tree
  When the script runs with the baseline-writing flag
  Then the baseline file is regenerated deterministically
  And re-running the gate with the fresh baseline passes on an unchanged tree

Scenario: an unusable tool is a failure, not a finding
  Test: a mise shim without a pinned version is reported as unusable
  Given a tool on PATH that errors instead of running
  When the section executes
  Then the summary reports `failed: <tool> unusable` with the tool's own error
  And the run does not report it as findings, nor as a skip

Scenario: an anti-bot 403 never counts as debt growth
  Test: five consecutive runs on an unchanged tree all pass
  Given the documented anti-bot host list
  When the lychee section encounters a 403 from that host
  Then the entry is dropped and the drop is printed
  And five consecutive runs on the untouched tree exit 0 with the lychee residual unchanged

Scenario: a genuinely broken link still fails
  Test: a 404 in a tracked docs file fails the section
  Given a docs file containing a URL that returns 404
  When the lychee section runs
  Then the section fails naming the file and the URL
  And the anti-bot rule is not applied to it (404 is not 403)

Scenario: the suite still passes end to end
  Test: just ci exits zero
  Given the edits
  When `just ci` runs
  Then check-drift, docs-lint, agents-lint and bun test all pass
