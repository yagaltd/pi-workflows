spec: task
name: "casual-intake-emitter"
tags: []
---

## Intent

Wire casual intake (backlog item 8): `idea` and `brainstorm` sessions emit typed candidate requirement blocks in the agent-spec fork's marked PRD/issue block format, to `.workflows/intake/<date>-<slug>.md`, verified by `agent-spec requirements import --from <file> --check` (validates without importing). Import runs only on human approval; rejected blocks stay annotated `rejected: <reason>` in the intake file. Governance unchanged — post-import transitions are the fork's explicit human commands.

## Decisions

- The marked-block format is discovered from the fork's import implementation (`/home/aurel/Documents/vibe/coding-agent/agent-spec` — read-only reference; grep the `requirements import` command source). The upstream clone `/home/aurel/Documents/github/agent-spec` may also carry the parser — read-only reference too.
- Each prompt gains ONE intake paragraph: emit `.workflows/intake/<date>-<slug>.md`, run the `--check` verify, and STOP — import only on explicit human approval of specific blocks; rejected blocks get `rejected: <reason>` annotations in place.
- Fixture: a sample intake file under `tests/intake/` proven by `agent-spec requirements import --from tests/intake/<fixture>.md --check` exiting 0.
- STOP-AND-RESCOPE: if the format is ambiguous or the parser rejects valid-looking blocks after honest attempts, output a WORKER_BLOCKER (unclear_requirement) — orchestrator re-scopes with the owner.
- `prompts/idea.md` total ≤ 20 lines after the change (thin trigger).

## Boundaries

### Allowed Changes
- prompts/idea.md
- prompts/brainstorm.md
- tests/intake/**

### Forbidden
- Do not run the real import (no `--check`-less invocation, ever — validation only).
- Do not modify the fork or the upstream clone (read-only references).
- Do not touch `scripts/**`, `agents/**`, `skills/**`, README, CHANGELOG (TASK 2 scope), `extensions/**`, `tests/**` outside `tests/intake/**`.
- Do not add dependencies.

## Completion Criteria

Scenario: fixture intake file passes the import check
  Test: agent-spec requirements import --from tests/intake/sample-intake.md --check --out tests/intake/rendered
  Given tests/intake/sample-intake.md in the discovered marked-block format
  When the fork's import check runs on it
  Then it exits 0 with no block errors

Scenario: idea prompt carries the intake step
  Test: grep -q "requirements import" prompts/idea.md && grep -q ".workflows/intake/" prompts/idea.md
  Given prompts/idea.md after the change
  When the intake step is inspected
  Then it names the intake path and the check-first verify
  And the human-approval-only import rule is stated

Scenario: brainstorm prompt carries the intake step
  Test: grep -q "requirements import" prompts/brainstorm.md && grep -q ".workflows/intake/" prompts/brainstorm.md
  Given prompts/brainstorm.md after the change
  When the intake step is inspected
  Then the same intake step appears (one paragraph)

Scenario: thin trigger holds for the idea prompt
  Test: test $(wc -l < prompts/idea.md) -le 20
  Given prompts/idea.md after the change
  When the file length is measured
  Then it is ≤ 20 lines
