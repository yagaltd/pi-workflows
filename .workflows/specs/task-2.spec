spec: task
name: "open-diagram-render"
tags: [diagram, open-diagram, renderer]
verify: "bun test tests/open-diagram-render.test.ts"
max-rounds: 2
---

## Intent

Add a thin, injectable renderer seam that turns a supplied diagram spec into open-diagram SVG + PNG artifacts plus the measurements a caller needs to judge the result. The seam renders only when invoked; it never decides whether a diagram is warranted.

## Decisions

- The render function accepts an injectable `run` option (defaults to the real open-diagram CLI runner). Tests pass a stub; `bun test` requires no Python or open-diagram installation.
- Rendering goes through the locally verified open-diagram 0.4.0 CLI and produces both SVG and PNG for the supplied spec.
- The result exposes `{ svgPath, pngPath, widthPx, heightPx, smallestTextPx, layoutProblems, altText }`.
- Any reported layout problem, or a smallest-text size below the 10 px legibility floor, throws a loud error naming the offending measurement; no partial success result is returned.
- `altText` is a non-empty textual description of the supplied diagram so callers can carry text alongside the image.
- The seam makes no format decision: no output-policy call, no chooser call, no diagram/table/prose selection, no judge call.
- Unit tests use a stub runner with fixture artifacts; example-based assertions cover artifacts, metrics, alt text, and the negative failure path.

## Boundaries

### Allowed Changes
- .workflows/specs/task-2.spec
- scripts/open-diagram-render.mjs
- tests/open-diagram-render.test.ts

### Forbidden
- .workflows/plan.md
- scripts/output-policy.mjs
- scripts/format-chooser.mjs
- scripts/closeout.mjs
- extensions/index.ts
- docs/**
- README.md
- CHANGELOG.md
- other tests/specs
- Do not add launcher, mise, or documentation wiring (TASK 7 owns those)
- Do not change existing renderer, chooser, close-out, or extension behavior

## Completion Criteria

Scenario: Render writes SVG and PNG artifacts
  Test: test_render_writes_artifacts
  Given a supplied diagram spec and a stub runner that records invocations and writes fixture SVG and PNG files
  When the supplied spec is rendered with that injected runner
  Then the runner is invoked once with an open-diagram 0.4.0 CLI command for that spec
  And the result exposes both an SVG path and a PNG path that exist on disk

Scenario: Render reports diagram metrics
  Test: test_render_reports_metrics
  Given a stub runner returning fixture measurements of 2020 x 711 px, smallest text 10.5 px, and 0 layout problems
  When the supplied spec is rendered
  Then the result reports widthPx 2020, heightPx 711, smallestTextPx 10.5, and layoutProblems 0
  And the result contains no format decision, policy verdict, or chooser output

Scenario: Render returns alt text
  Test: test_render_returns_alt_text
  Given a supplied diagram spec carrying a descriptive title
  When the supplied spec is rendered successfully
  Then the result includes a non-empty altText string describing that diagram
  And the artifact paths remain additive to that text rather than replacing it

Scenario: Layout problem or illegible text fails loudly
  Test: test_render_fails_on_layout_problem
  Given a stub runner reporting a layout problem, or a smallest-text size below 10 px
  When the supplied spec is rendered
  Then rendering rejects with an error naming the layout problem or the illegible-text measurement
  And no successful artifact-and-metrics result is returned
