spec: task
name: "init-formatter-profiles"
tags: [init, dprint, formatter]
verify: "bun test tests/init-extract.test.ts tests/profile-lint.test.ts && mise exec -- bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Extend `/init --adopt` extraction with a deterministic formatter-profile detection registry and an owner-gated offer, so consumer projects see a truthful, tool-verified read-only format check command instead of an invented formatter or a silent pass. Detection reads on-disk build markers and existing formatter config only; nothing is written to a consumer repo before explicit owner approval, and Markdown stays under docs-lint.

## Decisions

- The registry lives in `scripts/init-extract.ts` as a table of marker predicates to profile definitions. Given the same root, it emits byte-identical results with an id, exact read-only check command, evidence paths, and status (`offer` or `skip`).
- Detection is driven by build markers and existing formatter config on disk (manifest scripts/dependencies, formatter config files, pinned tools, observed source paths). It is language-agnostic: no baked language list, no judge answer, no default formatter from a bare language guess. Unknown markers yield no profile.
- Registry rules, not universal stack assumptions: TS/JS/JSON → dprint native TypeScript/JSON plugins; Python → Ruff (`ruff format --check`) with the dprint Ruff wrapper only when existing config names it; Rust → `cargo fmt --check` preferred, with dprint exec only on explicit owner request for a single dprint surface; shell → `shfmt`; TOML/SQL/Jupyter/Dockerfile → dprint plugins only where the plugin is pinned and deterministic in existing config. Markdown is excluded.
- Owner gate only: detection produces an OFFER naming the profile, command, evidence, and explicit-approval requirement. No format/check process runs, and no formatter config or final profile file is written without explicit owner approval.
- Missing tool is a LOUD SKIP, never a PASS: resolution failure prints `SKIP: formatter <id> ... (tool not found)` with the executable named, invents no command, and writes nothing.
- Exit precedence: any existing schema/profile FAIL keeps exit 1; formatter SKIP exit 3 applies only when no other check failed. Markdown-only formatter drafts emit no formatter PASS/SKIP verdict at all.
- `scripts/profile-lint.sh` gains an optional `formatter` block check over draft profiles: validate id, command, evidence, and status; emit SKIP on stderr with a distinct nonzero exit status (3, not 0 or 1) when the tool is absent. Existing command/pointer/tree/gate/stamp checks stay unchanged.
- No schema change: the live judge schema in `extensions/index.ts` is outside Allowed Changes. Formatter detection stays local deterministic code; the existing `*.draft`-only write path stays draft-only.
- Implementation artifact (not a scenario): place `@cc [label:init-formatter-offer] owner-gated-offer-only` at the offer/write seam. No per-file or folder-tree annotations.

## Boundaries

### Allowed Changes
- .workflows/specs/task-2.spec
- scripts/init-extract.ts
- scripts/profile-lint.sh
- tests/init-extract.test.ts
- tests/profile-lint.test.ts

### Forbidden
- .workflows/plan.md
- mise.toml
- dprint.json
- skills/**
- agents/**
- docs/**
- README.md
- CHANGELOG.md
- scripts/wf.sh
- Any other path, including `extensions/index.ts`, `templates/**`, `.mise/**`, other `scripts/**`, and other `tests/**`
- Do not change existing adoption semantics: `INIT_EXTRACT_SCHEMA`, gate booleans, draft filenames, charter/template output, or the generated mise wrapper text

## Completion Criteria

Scenario: registry maps observed markers and config to deterministic profiles
  Test: test_formatter_registry_detects_stacks
  Given fixture repos with on-disk evidence for dprint TS/JS/JSON, Python Ruff config, `Cargo.toml`, shfmt shell config, and dprint TOML/SQL/Jupyter/Dockerfile plugins, plus a control repo with source files but no marker or formatter config
  When the registry detector in `scripts/init-extract.ts` runs twice on each root
  Then outputs are byte-identical and carry profile id, exact read-only check command, and evidence paths
  And TS/JS/JSON resolve to dprint, Python to `ruff format --check` (dprint Ruff wrapper only when configured), Rust to `cargo fmt --check` (dprint exec only behind explicit owner request), shell to `shfmt`, and TOML/SQL/Jupyter/Dockerfile to dprint only where deterministic in existing config
  And the control repo yields no formatter profile and no Markdown target appears anywhere

Scenario: owner gate offers without writing or running
  Test: test_owner_gate_offer
  Given a detected Python Ruff profile and a detected Rust profile with `cargo fmt --check` available
  When the owner-gate offer is built
  Then the text names the profile id, exact check command, evidence path, and the words "requires explicit owner approval"
  And the Rust offer lists dprint exec only as an opt-in alternate for a single dprint surface, never the default
  And declining or answering nothing leaves every file byte-identical and no format/check process is spawned

Scenario: no unapproved formatter writes
  Test: test_no_unapproved_writes
  Given fixture roots with detected dprint, Ruff, and Rust profiles and an offer with no explicit approval
  When detection and the offer run through both the module API and the CLI path
  Then no `dprint.json`, `ruff.toml`, `.ruff.toml`, formatter entry in `mise.toml`, final `.workflows/profile.json`, or other formatter file is created or edited
  And existing file contents and modes are unchanged, with only existing `*.draft` artifacts allowed to gain an optional formatter evidence/offer block
  And a negative attempt to apply the profile without the approval flag is rejected

Scenario: missing tool is a loud skip
  Test: test_missing_tool_loud_skip
  Given a fixture with valid dprint config and evidence but no dprint executable reachable on PATH via a controlled PATH stub
  When detection and `scripts/profile-lint.sh` run
  Then stderr contains `SKIP: formatter dprint ... (tool not found)` with the missing executable named
  And no `PASS` token is emitted for that formatter, the lint exits 3, and no command is invented or executed
  And the same fixture with the tool restored produces the normal OFFER with the check command

Scenario: Markdown stays outside formatter scope
  Test: test_markdown_excluded
  Given a dprint-configured fixture with Markdown files and a config that would load the Markdown plugin
  When the registry builds targets and `profile-lint.sh` validates the draft
  Then no `.md` or `.mdx` path appears in formatter targets or check arguments, and the offer names Markdown as excluded with docs-lint authoritative
  And the lint emits no formatter PASS/SKIP for Markdown alone
