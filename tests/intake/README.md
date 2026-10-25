# Intake fixture — marked requirement block format (agent-spec fork 1.5.0)

Discovered from the fork's import implementation (read-only reference
`/home/aurel/Documents/vibe/coding-agent/agent-spec`): parser
`src/spec_knowledge/intake.rs::parse_requirement_blocks`, command
`src/main.rs::cmd_requirements_import` (`requirements import --from --out
--check --provenance`). The upstream clone
(`/home/aurel/Documents/github/agent-spec`) has no marked-block parser — the
fork is the only authority. This file is the format record; TASK 2 docs and
future intake files take their syntax from here.

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

## Import lifecycle (D2/D4 of plan 20261025-019)

1. A session emits candidate blocks to `.workflows/intake/<date>-<slug>.md`.
2. Verify: `agent-spec requirements import --from <file> --check --out .workflows/requirements/`.
   - Parse errors mean a malformed block — fix the format.
   - `error: generated requirement artifact drifted: <path>` for not-yet-imported
     blocks is the EXPECTED pre-approval state: the parse succeeded and `<path>`
     is the artifact an approved import would create. In fork 1.5.0 `--check` is
     a drift gate (parse -> render -> byte-compare against the `--out` corpus),
     not a parse-only validator; it exits 0 only once the corpus contains the
     byte-identical rendered artifacts.
3. STOP for human review. Rejected blocks stay in the intake file annotated
   `rejected: <reason>`. Never run the import without `--check` without
   explicit human approval of specific blocks.
4. On approval, put only the approved blocks in a clean file (the import has no
   per-block filter — it imports every block in the file) and run the real
   import: `agent-spec requirements import --from <file> --out .workflows/requirements/`.
   Artifacts are named `<id-lowercase>-<slugified-title>.md` with frontmatter
   `kind: requirement / status: proposed / liveness: auto`; afterwards the same
   `--check` command exits 0 (drift gate green). Governance transitions remain
   the fork's explicit human commands (`requirements transition`, `supersede`).

## This fixture

- `sample-intake.md` — realistic 2-block candidate sample (feature idea
  `REQ-HISTORY-EXPORT` + guardrail idea `REQ-INTAKE-APPROVAL`).
- `rendered/` — the exact artifacts the fork's renderer produces for those
  blocks (checked in, following the fork's own noteapp fixture pattern:
  `fixtures/requirements-noteapp` runs `import --from <prd> --out <checked-in
  corpus> --check` as its demo gate). Note the renderer's Source Trace quirk,
  reproduced byte-exactly in
  `rendered/req-history-export-export-run-history.md`: two blank lines before
  `## Source Trace`, none between the source bullet and `## Open Questions`.

Verify (exit 0 proves parse + byte-exact round-trip):

    agent-spec requirements import --from tests/intake/sample-intake.md --check --out tests/intake/rendered
