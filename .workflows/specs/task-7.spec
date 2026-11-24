spec: task
name: "output-format-release"
tags: [docs,gates,release]
verify: "bun test tests/wf-launcher.test.ts tests/mise-tasks.test.ts tests/chooser-wiring.test.ts tests/gen-docs.test.ts tests/eval-golden.test.ts && bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Expose the deterministic output-policy module and the open-diagram renderer through the shared launcher and mise task surface, then land the docs, drift baseline, golden case, and CHANGELOG entry for plan 20261123-075. The release keeps canonical text as the source of truth, treats every image as a generated view, and adds no judge path.

## Decisions

- Wire the two scripts created by earlier tasks — `scripts/output-policy.mjs` and `scripts/open-diagram-render.mjs` — as `output-policy` and `open-diagram-render` subcommands of `scripts/wf.sh`, with matching executable `.mise/tasks/output-policy` and `.mise/tasks/open-diagram-render` file tasks that forward all arguments to the launcher. Do not edit the two script bodies; they are owned by TASK 1 and TASK 2.
- `scripts/wf.sh` remains the single shell entry point: add both names to `usage()` and to the `case` dispatch using root-relative paths derived from the launcher's own location, with arguments forwarded verbatim. Unknown subcommands still print usage and exit 2. `mise.toml` stays a tool pin only; do not add `[tasks]`.
- The README command table between `<!-- generated:commands:start -->` and `<!-- generated:commands:end -->` stays generated from `prompts/*.md` frontmatter by `scripts/gen-docs.mjs`. Because `prompts/**` is forbidden in this task, never hand-edit the table or invent script rows inside the markers; document the new launcher/mise entrypoints in README prose outside the markers.
- Regenerate `scripts/docs-lint-baseline.json` only with `bash scripts/docs-lint.sh --write-baseline` after doc edits; never hand-edit counts to make the gate pass. Keep docs claim lines compliant with docs-lint §5 by carrying a gate reference on the same line.
- Update golden evidence with a conventional recorded-replay case under `.workflows/evals/golden/` (`id`, `kind`, `tags`, `recorded`, `expected`), no live judge calls, and no edit to `.workflows/evals/baseline.jsonl`.
- Document and enforce the fixed policy: always prose summary plus display-only status tokens; table when `>=3` rows share `>=3` comparable fields or the artifact is the mandatory closeout/next-moves table; open-diagram when `>=4` tasks AND (`>=2` dependencies OR `>=2` waves OR `>=2` status mix), OR a fix loop/state machine must be understood, OR `>=3` components with `>=2` meaningful links must be seen together. PNG/SVG is additive with alt text, never image-only, and never replaces judge-readable text or the follow-up table.
- Document the flow as policy module to chooser, `/status`, close-out, and TUI renderer, and state explicitly that this plan adds no new judge call, no new TypeLLM path, and no change to dispatched-verdict semantics.
- Add the next-version CHANGELOG entry containing the literal Plan ID `20261123-075` so `scripts/check-archive.sh` passes at SHIP.
- Follow TDD: add failing coverage in the five allowed test files first, then make the wiring/docs changes; `bun test` stays green. Each Test selector below must be discoverable from the Verify pipeline.

## Boundaries

### Allowed Changes
- `.workflows/specs/task-7.spec`
- `scripts/wf.sh`
- `.mise/tasks/output-policy`
- `.mise/tasks/open-diagram-render`
- `tests/wf-launcher.test.ts`
- `tests/mise-tasks.test.ts`
- `tests/chooser-wiring.test.ts`
- `tests/gen-docs.test.ts`
- `tests/eval-golden.test.ts`
- `.workflows/evals/golden/`
- `scripts/gen-docs.mjs`
- `package.json`
- `scripts/docs-lint-baseline.json`
- `README.md`
- `docs/architecture.md`
- `CHANGELOG.md`

### Forbidden
- `.workflows/plan.md`
- `scripts/output-policy.mjs`
- `scripts/open-diagram-render.mjs`
- `scripts/format-chooser.mjs`
- `scripts/closeout.mjs`
- `extensions/index.ts`
- `prompts/**`
- Other tests and specs, and every path not listed in Allowed Changes.

## Completion Criteria

Scenario: Both new scripts are reachable through the shared launcher and mise
  Test: test_release_launcher_wiring
  Given `scripts/wf.sh` is the single shell entry point and the two new mise task files are executable bash file tasks that forward to it
  When the release adds `output-policy` and `open-diagram-render` subcommands plus their two matching mise task files
  Then `scripts/wf.sh` lists both names in `usage()` and dispatches each with `exec node "$root/scripts/<name>.mjs" "$@"` from the launcher-derived root
  And each new mise task file starts with `#!/usr/bin/env bash`, carries `set -euo pipefail`, a `#MISE description=...` line, a `# Usage: mise run <name>` line, and contains `./scripts/wf.sh <name> "$@"`
  And an unknown subcommand still exits 2 with usage, `mise.toml` still has no `[tasks]` section, and no other script body is moved or rewritten

Scenario: Documentation states the text-first policy and the generated table stays generated
  Test: test_release_generated_docs_clean
  Given `README.md` contains the `generated:commands` markers and `scripts/gen-docs.mjs --check` is the authority for that block
  When the release updates `README.md` and `docs/architecture.md`
  Then the marker-delimited table equals `scripts/gen-docs.mjs` regeneration, text outside the markers is preserved, and no row is fabricated for a script that is not a prompt
  And README prose documents canonical text with prose summary plus plain-word status names (Done, Decision, Pending, Failed, Unverified) and names the canonical vocabulary mapping of record; tracked README contains no literal `[[` tokens; the table and diagram thresholds, additive images with alt text as generated views, and the two launcher/mise entrypoints are also documented
  And `docs/architecture.md` shows the policy module to chooser/status/close-out/TUI-renderer flow and states no new judge call, no new TypeLLM path, and no verdict-semantics change

Scenario: Negative — stale generated docs or an unregenerated baseline fail the drift gates
  Test: test_release_drift_gates_clean
  Given the repo after the deliberate documentation and golden-case edits
  When a probe tampers with the `generated:commands` block or leaves `scripts/docs-lint-baseline.json` at its pre-edit counts
  Then `bash scripts/docs-lint.sh` exits non-zero and names the generated-table drift or budget breach
  And restoring `scripts/gen-docs.mjs` regeneration plus `bash scripts/docs-lint.sh --write-baseline` makes the Verify pipeline's `bash scripts/docs-lint.sh` and `bash scripts/check-drift.sh` exit 0
  And the updated golden case is exercised as recorded replay with filesystem assertions under `.workflows/evals/golden/`, never `git status` for untracked state, and the existing eval baseline file is untouched

Scenario: CHANGELOG carries the archive-gate Plan ID
  Test: test_release_changelog_plan_id
  Given the archive gate reads the literal Plan ID from the live plan header and greps `CHANGELOG.md` for it
  When the release adds its next-version entry
  Then `CHANGELOG.md` contains `plan 20261123-075: adaptive output format — deterministic text-first policy with earned diagrams`
  And the string `20261123-075` appears verbatim so the archive gate passes
  And the live plan remains unchanged
