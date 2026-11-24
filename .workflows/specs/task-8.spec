spec: task
name: "final-review-integration"
tags: [review-fix, integration, output]
verify: "bun test && bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

Close the defects found by the whole-plan review after task 7: the deterministic policy is unreachable from the shipped CLI surfaces, the close-out renderer receives fenced Mermaid and loses the canonical report on renderer failure, the open-diagram CLI path is hard-coded, and the TUI image renderer has no in-repo producer. Keep the canonical text output authoritative and fix the integration seams without weakening tests.

## Decisions

- Keep `decideOutputPolicy` pure and I/O-free; expose a separate CLI wrapper that accepts explicit policy inputs and prints the JSON decision.
- The `output-policy` launcher and mise task must invoke that wrapper, which prints a decision even with empty input.
- The `format-chooser` CLI must accept explicit policy inputs and bind them to `decideOutputPolicy`; its judge answers remain advisory.
- The open-diagram renderer must honor an environment override for the CLI path, with the verified local venv path only as the default.
- Close-out must strip Markdown fences before handing a spec to the renderer, and must emit the canonical report before any renderer attempt so a renderer failure cannot suppress text.
- A shipped surface must emit the generated-view message type consumed by the extension; text remains complete without it.
- No test assertion may be weakened to make the suite green; docs-lint budgets must hold or fall.

## Boundaries

### Allowed Changes
- .workflows/specs/task-8.spec
- scripts/output-policy.mjs
- scripts/output-policy-cli.mjs
- scripts/open-diagram-render.mjs
- scripts/format-chooser.mjs
- scripts/closeout.mjs
- extensions/index.ts
- prompts/status.md
- scripts/wf.sh
- .mise/tasks/output-policy
- README.md
- docs/architecture.md
- scripts/docs-lint-baseline.json
- tests/output-policy.test.ts
- tests/open-diagram-render.test.ts
- tests/format-chooser.test.ts
- tests/closeout.test.ts
- tests/closeout-wiring.test.ts
- tests/extension.test.ts
- tests/status-wiring.test.ts
- tests/wf-launcher.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- tests/prompt-doctrine.test.ts
- tests/ship-wiring.test.ts
- skills/**
- agents/**
- package.json
- every path not listed in Allowed Changes

## Completion Criteria

Scenario: policy wrapper emits a real decision
  Test: test_policy_cli_emits_json
  Given scripts/output-policy-cli.mjs and the output-policy launcher entrypoint
  When the wrapper runs with explicit policy inputs and with no inputs
  Then stdout is JSON containing the four boolean policy keys
  And the pure decision module remains free of filesystem and network I/O

Scenario: chooser CLI binds real policy inputs
  Test: test_chooser_cli_binds_policy_inputs
  Given the format-chooser CLI with a plan-shaped policy input whose diagram flag is true
  When the chooser runs against a real content file
  Then the emitted artifact is the policy diagram form
  And a judge suggestion alone still cannot select a diagram on a policy negative

Scenario: renderer path override is honored
  Test: test_renderer_cli_path_override
  Given an OPEN_DIAGRAM_CLI override pointing to a stub executable
  When renderDiagram uses the default runner
  Then the stub is invoked and the returned artifacts and metrics are parsed from its output

Scenario: close-out renders a real fence-free spec
  Test: test_closeout_real_renderer_accepts_spec
  Given a close-out fixture whose real policy input earns a diagram
  When renderCloseout invokes the real renderer adapter with a recording runner
  Then the recorded spec does not start with a Markdown fence
  And the canonical report text is present before the generated view

Scenario: renderer failure cannot suppress the report
  Test: test_closeout_report_precedes_renderer_failure
  Given a renderer that throws
  When renderCloseout runs with a diagram positive
  Then the canonical report is still returned or emitted
  And a loud renderer failure message names the failure without removing text

Scenario: generated-view message has an in-repo producer
  Test: test_generated_view_message_has_producer
  Given the extension generated-view renderer and its message type
  When a shipped output surface has a policy diagram positive and a generated artifact
  Then a message carrying that type and the artifact details is produced
  And the canonical prose remains present in that message

Scenario: full integrated suite is green
  Test: test_final_review_integration_gates
  Given the merged tree after this fix task
  When the Verify command runs
  Then bun test reports zero failures
  And docs-lint and check-drift exit zero with no budget rise
