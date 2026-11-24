spec: task
name: "status-format"
tags: [status,prompt,output]
verify: "bun test tests/status-wiring.test.ts"
max-rounds: 2
---

## Intent

Wire the status command to the deterministic output policy so every report opens with a short prose summary and display-only status tokens while the existing markdown template stays the canonical text. A policy-approved diagram is an additive generated view; status markers, plan parsing, and bottleneck tag grammar are unchanged.

## Decisions

- Keep the existing markdown template in `prompts/status.md`, including `## Progress`, the ✅/🔄/⬜/❌ task lines, `### Bottleneck Tags`, `### Contracts`, `### Domain Memory`, `### Cost Summary`, `### Duration Summary`, and `### Next up`; preserve the prompt frontmatter and trailing `$@` invocation.
- Prepend a short prose summary and display-only status tokens (`[[Done]]`, `[[Decision]]`, `[[Pending]]`, `[[Failed]]`, `[[Unverified]]`) before the canonical template. Tokens decorate the reply only; they are never written into `.workflows/plan.md`.
- Consume the TASK 1 policy result as given: prose summary and status tokens are always present. `prompts/status.md` owns no thresholds, chooser logic, or judge call.
- A policy-approved diagram is appended after the complete text with alt text. Without a policy positive, no image is emitted; with one, the text report stays complete and readable on its own.
- Do not change status markers, `done(<ref>)`/`deferred(trigger:)` ledger grammar, plan parsing commands, cost/duration sections, or the 🔴 BLOCKING / 🟡 RISKY / 🟠 VERIFICATION_HEAVY / ⚪ STANDARD bottleneck vocabulary.

## Boundaries

### Allowed Changes
- .workflows/specs/task-5.spec
- prompts/status.md
- tests/status-wiring.test.ts

### Forbidden
- .workflows/plan.md
- scripts/output-policy.mjs
- scripts/open-diagram-render.mjs
- scripts/format-chooser.mjs
- scripts/closeout.mjs
- extensions/index.ts
- docs/**
- README.md
- CHANGELOG.md
- tests/** except tests/status-wiring.test.ts
- .workflows/specs/** except .workflows/specs/task-5.spec

## Completion Criteria

Scenario: Status keeps canonical text
  Test: test_status_keeps_canonical_text
  Given prompts/status.md and a policy result with prose and status tokens enabled
  When the status report is assembled
  Then a short prose summary followed by display-only status tokens appears before the `## Plan:` header
  And every existing markdown section, including `### Bottleneck Tags`, `### Cost Summary`, and `### Duration Summary`, still renders in its current order with its current content

Scenario: Diagram appears only on policy approval
  Test: test_status_adds_diagram_only_when_policy_allows
  Given a status report whose policy result has a diagram positive and a generated artifact with alt text
  When the report is assembled
  Then the image reference with alt text is appended after the complete canonical text and before no text section is removed
  And with a policy result that has no diagram positive, the report is text-only with no image reference while the prose summary and tokens remain

Scenario: Negative — marker and grammar invariants hold
  Test: test_status_preserves_marker_grammar
  Given the pre-wiring prompts/status.md template
  When the wired template is compared against it
  Then ✅/🔄/⬜/❌ markers, bottleneck tag labels, and plan parsing instructions are byte-for-byte unchanged
  And no ledger token grammar, generated-file write, or new status vocabulary is introduced
