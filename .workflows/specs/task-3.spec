spec: task
name: "formatter-gate-doctrine"
tags: [docs, review, format]
verify: "bun test tests/prompt-doctrine.test.ts && mise exec -- bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Pin the gate-timing doctrine for the formatter work so scope never leaks across roles: a worker runs a scoped read-only check in Verify, `fmt` is reserved for an explicitly contracted formatting task on explicit paths, reviewers consume recorded output without re-deriving or repairing it, pre-commit stays staged/read-only, and `/review` Stage 1 runs the whole-tree check. Wave 2 depends on TASK 1 and TASK 2: document the surfaces that actually landed, keep Markdown under `scripts/docs-lint.sh`, and add no verification task.

## Decisions

- TDD order is fixed: add all five selectors to `tests/prompt-doctrine.test.ts` first, observe the Verify chain fail against the current docs, then change docs; never weaken a test to make it pass.
- Gate timing is fixed: worker Verify = scoped read-only check; explicit formatting task = `fmt` on explicit paths only; reviewer = consume recorded output; pre-commit = staged read-only; `/review` Stage 1 = whole-tree read-only check.
- Reviewers stay read-only: no re-derivation, no widened re-run, no repair; the existing Tier 0 / Rules sections carry the rule, not a new role or task.
- No new verification task, prompt, or role is introduced; extend the existing docs and prompt surfaces only.
- Markdown is excluded from the formatter gate; `scripts/docs-lint.sh` remains the sole Markdown authority, and `scripts/docs-lint-baseline.json` is regenerated only by `bash scripts/docs-lint.sh --write-baseline` — never hand-edited.
- Docs claims must match landed TASK 1 / TASK 2 evidence (`format-check` read-only `--list-different`, optional `format`, detected owner-gated profiles, loud SKIP on a missing tool); every behavioral claim names its gate (gate: `docs/canon.md` rule 4).
- Content-fact cross-check: verify every named path, command, and count against the landed tree before writing a scenario; a passing grep never substitutes for repo truth.
- No CHANGELOG entry, no formatter config edit, no `mise.toml` edit, no source-formatting rewrite.

## Boundaries

### Allowed Changes
- .workflows/specs/task-3.spec
- skills/init/SKILL.md
- agents/reviewer.md
- skills/review/SKILL.md
- README.md
- docs/architecture.md
- docs/canon.md
- scripts/docs-lint-baseline.json
- tests/prompt-doctrine.test.ts

### Forbidden
- .workflows/plan.md
- scripts/init-extract.ts
- scripts/profile-lint.sh
- mise.toml
- dprint.json
- CHANGELOG.md
- package.json
- any other path

Evidence reads are permitted; edits outside Allowed Changes are not.

## Completion Criteria

Scenario: Worker Verify is scoped and read-only
  Test: test_worker_verify_scoped_check
  Given TASK 1 and TASK 2 have landed and the formatter doctrine is missing from the allowed docs
  When the worker writes the selector first, then reads `skills/init/SKILL.md` and the Gates section of `README.md`
  Then the test is RED before the docs change and GREEN after they state that Verify runs the read-only format check scoped to the task's explicit paths, never `fmt` there
  And they state `fmt` is allowed only inside an explicitly contracted formatting task on explicit paths
  And `README.md` states the pre-commit check is staged/read-only and never rewrites files

Scenario: Reviewer consumes recorded output
  Test: test_reviewer_consumes_output
  Given a worker proof records the scoped Verify output
  When the Tier 0 / Rules slice of `agents/reviewer.md` is read
  Then it states the reviewer reads the recorded format-check output as evidence and does not re-derive, widen, or repair it
  And it keeps the read-only verdict role and never runs `fmt`
  And no allowed surface introduces a new verification task or prompt; the existing tiers absorb the rule

Scenario: /review Stage 1 checks the whole tree
  Test: test_stage1_whole_tree_check
  Given per-task Verify checked only scoped paths
  When the `## Stage 1: Mechanical Verification` slice of `skills/review/SKILL.md` is read
  Then it names the read-only whole-tree `format-check` (`mise run format-check`) as part of the full verification suite
  And it states a scoped per-task result is not a substitute for the whole-tree check
  And it states Stage 1 never runs `format`/`fmt` to repair files

Scenario: Markdown has one authority (negative)
  Test: test_markdown_docs_lint_authority
  Given a detected formatter profile could include Markdown
  When `docs/canon.md`, `README.md`, and `skills/init/SKILL.md` are read
  Then they state Markdown is excluded from the format check and `scripts/docs-lint.sh` remains the sole Markdown authority
  And no allowed surface grants a Markdown formatter, a second Markdown checker, or a `fmt` rewrite of validated fences
  And `scripts/docs-lint-baseline.json` names only `bash scripts/docs-lint.sh --write-baseline` as its generator and is never hand-edited

Scenario: Generated docs and budgets stay clean
  Test: test_generated_docs_clean
  Given the doc edits are complete and any budget change came only from `bash scripts/docs-lint.sh --write-baseline`
  When the test runs `mise exec -- bash scripts/docs-lint.sh` and `bash scripts/check-drift.sh` read-only, with no `--write-baseline` in the verification leg
  Then both exit 0 and no per-file budget rises above the pre-task snapshot
  And `docs/architecture.md` places the format gate beside check-drift/docs-lint without replacing either
  And README/canon/init claims match the landed TASK 1 / TASK 2 surfaces (`format-check`, optional `format`, `--list-different`, detected owner-gated profiles, loud SKIP) with no generated-table or tree-manifest drift
