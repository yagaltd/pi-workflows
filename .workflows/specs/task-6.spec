spec: task
name: closeout-format
tags: [closeout,ship,output]
verify: bun test tests/closeout.test.ts tests/closeout-wiring.test.ts
max-rounds: 2
---

## Intent

Wire close-out/SHIP output to the deterministic text-first policy without weakening the audit trail: prose stays the source of truth, a policy-approved open-diagram artifact is an additive generated view rendered through the existing `--diagram` seam, and the settle judge keeps reading report text only. The five text sections and the mandatory `### Next moves` table remain unchanged and judge-readable.

## Decisions

- Reuse the existing `--diagram` flag and `renderReport(g, { diagram })` seam in `scripts/closeout.mjs`; add no new flag, subcommand, or output path.
- A policy-approved open-diagram artifact from the TASK 2 renderer seam is additive: append it after the pinned text sections and the `### Next moves` table, with its artifact path and alt text. Never replace, reorder, reword, or compress report text.
- Keep `reportText` as the settle judge's only input: no image path, alt text, renderer metric, or diagram flag enters the existing five settle questions, and no second judge call is made.
- Preserve the pinned six `### Next moves` columns in order: `Option | What | Effort | Risk | Unblocks | Recommend`. The explicit empty-queue line `- queue empty — nothing open` stays a valid brief.
- Keep `Shipped`, `Deviations`, `Discoveries`, `Deferred`, and `Watch` byte-for-byte identical to the no-diagram report.
- The renderer makes no format decision; only the TASK 1 policy returns the diagram positive. Inject/stub policy and renderer dependencies so `bun test` needs no Python or open-diagram CLI.
- Without a policy positive, no open-diagram artifact is produced; the existing `mermaid(g)` export and explicit `--diagram` text fallback stay intact for backward compatibility.

## Boundaries

### Allowed Changes
- .workflows/specs/task-6.spec
- scripts/closeout.mjs
- tests/closeout.test.ts
- tests/closeout-wiring.test.ts

### Forbidden
- .workflows/plan.md
- scripts/output-policy.mjs
- scripts/open-diagram-render.mjs
- scripts/format-chooser.mjs
- extensions/index.ts
- prompts/**
- docs/**
- README.md
- CHANGELOG.md
- other tests/specs
- Do not change the settle judge's question set, verdict semantics, or call count.
- Do not change the text of the Shipped, Deviations, Discoveries, Deferred, Watch, or Next moves sections.
- Do not add a second policy path or format decision inside close-out.

## Completion Criteria

Scenario: Policy-approved diagram is additive to close-out text
  Test: test_closeout_diagram_is_additive
  Given a fixture plan and queue with at least one Shipped task and one Next moves row, TASK 1 policy returns a diagram positive for close-out, and the TASK 2 renderer is stubbed to return SVG/PNG paths plus alt text
  When the close-out report is rendered with `--diagram` and the injected policy and renderer
  Then the output contains the unchanged Shipped, Deviations, Discoveries, Deferred, and Watch sections and the pinned six-column Next moves table in the same order as the no-diagram report
  And removing only the appended artifact block (path plus alt text) leaves the report text identical to the no-diagram report

Scenario: Mandatory Next moves table survives diagram wiring
  Test: test_closeout_keeps_next_moves_table
  Given a non-empty next-moves queue fixture and an explicitly empty queue fixture
  When the close-out report is rendered both with a policy-positive diagram and on the default prose path
  Then the non-empty case emits the exact header `| Option | What | Effort | Risk | Unblocks | Recommend |`, its separator, and every queue row with no column added, dropped, or reordered
  And the empty case still emits `- queue empty — nothing open` and remains a valid settle-brief answer

Scenario: Settle judge reads report text only
  Test: test_closeout_judge_reads_text_only
  Given a stubbed `ask` function that records its arguments and a report fixture that includes a policy-approved diagram artifact
  When `judge`/`settleJudge(reportText)` runs with report text
  Then the stub is called exactly once with the existing five settle questions whose prompts are built only from `reportText`
  And no image path, alt text, renderer metric, diagram flag, or additional judge call is passed into the judge input

Scenario: No policy positive keeps prose-only output (negative)
  Test: test_closeout_no_policy_no_diagram
  Given TASK 1 policy returns no diagram for a simple close-out and the renderer stub throws if called
  When the close-out report is rendered through `--diagram` with no override
  Then the renderer is never invoked, no SVG/PNG path or alt-text block appears, and exit code is 0
  And the five text sections and Next moves table remain intact while the pre-existing `mermaid(g)` text fallback is unchanged
