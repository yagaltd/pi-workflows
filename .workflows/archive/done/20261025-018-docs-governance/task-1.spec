spec: task
name: "docs-lint-drift-sections"
tags: []
---

## Intent

Extend `scripts/docs-lint.sh` with the doc-drift sections from backlog item 5 (the doc-drift gate: stamps enforcement + claim-to-gate mapping + optional pre-push hook): (1) stamp enforcement — a doc declaring `generated_by` must carry `generated_at` + `stale_after`, and an expired `stale_after` date is a finding; (2) claim-to-gate mapping — imperative claim lines (`must`, `must not`, `never`) in `AGENTS.md` + `docs/**` must carry a gate reference (backtick command/path on the same line). Fixtures drive the findings; the live repo may report findings until TASK 4 fixes the canon.

## Decisions

- Stamp rule: only files containing `generated_by:` (or `generated_by` prose token) are checked — hand-written docs without the token are exempt (no false positives by construction). Missing `generated_at`/`stale_after` ⇒ one finding each class. Expired: `stale_after` date < today ⇒ finding.
- Claim scan scope: `AGENTS.md` + `docs/**` only (curated surface; `DRIFT_CLAIM_SCOPE` env narrows further). Lines matching `/\bmust not\b|\bmust\b|\bnever\b/i` outside fenced code blocks and inline code spans require a gate reference: a backtick span containing `/` or a command shape, or a `gate:` token. Missing ⇒ finding with file:line + the claim text.
- Fixture support: `DRIFT_SCAN_DIR` env overrides the scan root so fixtures drive the findings deterministically.
- Output: findings as `file:line: <claim/excerpt>` lines; sections counted in the existing RAN/SKIPPED summary style.

## Boundaries

### Allowed Changes
- scripts/docs-lint.sh
- tests/docs-lint/**

### Forbidden
- Do not change the existing markdownlint/lychee/harper sections.
- Do not wire git hooks (the installer script is a separate decision).
- Do not add dependencies.

## Completion Criteria

Scenario: flags an expired stale_after stamp
  Test: grep -q "DRIFT_SCAN_DIR" scripts/docs-lint.sh
  Given a fixture doc with generated_by, generated_at, and a stale_after date in the past
  When docs-lint runs with DRIFT_SCAN_DIR pointing at the fixture
  Then a finding names the file and says the stamp expired

Scenario: flags a generated doc missing its stamps
  Test: grep -q "generated_by" scripts/docs-lint.sh
  Given a fixture doc with generated_by but no generated_at/stale_after
  When docs-lint runs on the fixture
  Then findings name the missing stamp keys

Scenario: accepts a current stamped doc
  Test: DRIFT_SCAN_DIR=tests/docs-lint/fixtures-current bash scripts/docs-lint.sh >/dev/null 2>&1
  Given a fixture doc with a future stale_after
  When docs-lint runs on the fixture
  Then the drift section reports no stamp findings

Scenario: flags a behavioral claim without a gate reference
  Test: grep -qE "must not.|never" scripts/docs-lint.sh
  Given a fixture doc line with "must not" and no gate reference
  When the claim scan runs on the fixture
  Then a finding names the file:line

Scenario: accepts a claim that names its gate
  Test: grep -q "gate" scripts/docs-lint.sh
  Given a fixture claim line carrying a backtick command
  When the claim scan runs on the fixture
  Then no finding is reported for that line
