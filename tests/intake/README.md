# Intake format record — marked requirement block format (agent-spec fork 1.5.0)

**Status: FORMAT RECORD — not a passing check.** No importer exists, so nothing
in this directory can be run or verified today. What is pinned here is the
syntax, a sample input, and the expected output a future implementation must
reproduce. The deferral is a decision of record: `.workflows/decisions/DEC-007.md`.

## Why nothing here runs (verified 2026-11-17)

- The installed binary has no such command: `agent-spec --version` is 0.2.7 and
  `agent-spec requirements --help` fails with
  `error: unrecognized subcommand 'requirements'`. The subcommand list is
  `parse, lint, verify, init, lifecycle, brief, contract, guard, explain, stamp,
  checkpoint, measure-determinism, install-hooks, resolve-ai, plan, graph,
  plan-check` — no `requirements`.
- The repo clone (`~/Documents/github/agent-spec`) has no marked-block parser:
  no `parse_requirement_blocks`, no intake module under `src/`.
- The fork this format was discovered from
  (`/home/aurel/Documents/vibe/coding-agent/agent-spec`, agent-spec fork 1.5.0)
  no longer exists on disk, so even the provenance below cannot be re-checked.

Consequence: an intake session emits marked blocks, the human approves, and the
blocks stay unimported — there is no command to hand them to. Nothing may claim
otherwise until an importer ships.

## Block format

    <!-- agent-spec:requirement id="REQ-SLUG-NAME" title="Title text" tags="tag1, tag2" source="origin:id" -->
    ## Problem
    ...
    <!-- /agent-spec:requirement -->

- Opening marker: the literal `<!-- agent-spec:requirement` followed by
  attributes, closed by `-->`. Closing marker: the exact
  `<!-- /agent-spec:requirement -->`.
- Prose outside markers is ignored by the parser (intro headers, rejection
  notes, etc. are fine).
- Attributes (parsed by a small whitespace/quote scanner, `key=value` or
  `key="value"`):
  - `id` — required. Uppercased by the parser, then must pass
    `validate_knowledge_id`: ASCII alphanumeric segments separated by single
    hyphens; must start with a letter, must contain at least one hyphen, no
    leading/trailing hyphen, no `--`. `REQ-101`, `REQ-HISTORY-EXPORT` pass;
    `../../escape`, `REQ--EMPTY`, `REQ.BAD` fail.
  - `title` — required.
  - `tags` — optional, comma-separated, each trimmed; rendered as
    `tags: [a, b]` (or `[]` when absent).
  - `source` — optional provenance string; rendered into a `## Source Trace`
    section of the artifact.
- Block body: the trimmed text between the markers. Conventions the fork's
  own examples and linters expect: `## Problem`, `## Requirements` with a
  single-line `[REQ-ID] The ... MUST ...` clause, `## Scenarios` (Gherkin),
  `## Open Questions`.
- Parse errors (exit 1, before any file comparison): unclosed opening marker,
  missing closing marker, missing/empty `id` or `title`, invalid id, duplicate
  id in the same file, and `no agent-spec requirement blocks found in <file>`
  when a file has zero blocks.

Provenance of this record (from the fork, now unverifiable on disk): parser
`src/spec_knowledge/intake.rs::parse_requirement_blocks`, command
`src/main.rs::cmd_requirements_import` (`requirements import --from --out
--check --provenance`). The upstream clone has no marked-block parser, so the
fork was the only authority — and it is gone.

## Import lifecycle — the contract a future implementation must satisfy (D2/D4 of plan 20261025-019)

Nothing below runs today. Read the commands as the shape an implementation
must provide, not as instructions.

1. A session emits candidate blocks to `.workflows/intake/<date>-<slug>.md`.
2. `--check` is a drift gate, not a parse-only validator: parse → render →
   byte-compare against the `--out` corpus, exiting 0 only once the corpus
   contains the byte-identical rendered artifacts. Parse errors mean a
   malformed block. `error: generated requirement artifact drifted: <path>` for
   not-yet-imported blocks is the expected pre-approval state — the parse
   succeeded and `<path>` is the artifact an approved import would create.
3. STOP for human review. Rejected blocks stay in the intake file annotated
   `rejected: <reason>`. No import happens without explicit human approval of
   specific blocks.
4. On approval, put only the approved blocks in a clean file (the import has no
   per-block filter — it imports every block in the file) and import them.
   Artifacts are named `<id-lowercase>-<slugified-title>.md` with frontmatter
   `kind: requirement / status: proposed / liveness: auto`; afterwards the same
   `--check` exits 0 (drift gate green). Governance transitions remain explicit
   human commands (`requirements transition`, `supersede`).

## This fixture: pinned examples, not a gate

- `sample-intake.md` — realistic 2-block candidate sample (feature idea
  `REQ-HISTORY-EXPORT` + guardrail idea `REQ-INTAKE-APPROVAL`).
- `rendered/` — the artifacts the fork's renderer produced for those blocks,
  checked in as the expected-output record. Note the renderer's Source Trace
  quirk, reproduced byte-exactly in
  `rendered/req-history-export-export-run-history.md`: two blank lines before
  `## Source Trace`, none between the source bullet and `## Open Questions`.
- There is no runnable verify line for this directory. The fork's own fixture
  pattern (`fixtures/requirements-noteapp` ran `import --from <prd> --out
  <checked-in corpus> --check`) is the reason these bytes are byte-exact, and
  it is also the shape a future `--check` must reproduce; until an importer
  exists, the only check available is reading a candidate implementation
  against this file.
