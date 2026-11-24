spec: task
name: "image-render-hook"
tags: [tui, image, extension]
verify: "bun test tests/extension.test.ts"
max-rounds: 2
---

## Intent

Render policy-approved generated diagrams in the Pi TUI as an additive generated view: the built-in `Image` component plus alt text, with the canonical prose left unchanged and usable on its own. The hook consumes upstream policy and renderer results as inputs; it never decides format itself.

## Decisions

- Render only when the upstream policy result says `diagram` is true and supplies a generated image path; no diagram, no image.
- Use Pi's built-in `Image` component with renderer-supplied alt text. Never emit markdown `![](path)` — Pi does not fetch markdown image paths.
- Prose (including status tokens and alt text) stays complete and unchanged in the text stream; the image is additive, never image-only.
- When images are blocked or unsupported (`terminal.showImages` false / unavailable protocol), degrade to the text stream cleanly: no blank output and no thrown error.
- Respect the configured `terminal.imageWidthCells` value; no hard-coded cell width and no protocol override.
- No policy, chooser, or verdict logic in `extensions/index.ts`: no thresholds, no format decisions, no judge suggestions, no calls into policy/chooser modules.

## Boundaries

### Allowed Changes
- `.workflows/specs/task-4.spec`
- `extensions/index.ts`
- `tests/extension.test.ts`

### Forbidden
- `.workflows/plan.md`
- `scripts/output-policy.mjs`
- `scripts/open-diagram-render.mjs`
- `scripts/format-chooser.mjs`
- `scripts/closeout.mjs`
- `prompts/**`
- `docs/**`
- `README.md`
- `CHANGELOG.md`
- other tests/specs
- Do not modify existing extension behavior beyond the additive render hook.

## Completion Criteria

Scenario: policy-positive diagram renders a TUI image
  Test: test_image_hook_renders_component
  Given an upstream policy result with a diagram positive, a renderer-produced image path, and canonical prose text
  When the render hook handles that result in the TUI
  Then the output contains a Pi built-in `Image` component referencing that exact path
  And the prose text is emitted unchanged with no markdown `![](path)` syntax
  And the image width comes from configured `terminal.imageWidthCells`, not a hard-coded value

Scenario: image carries alt text
  Test: test_image_hook_includes_alt_text
  Given the renderer supplied alt text for the diagram
  When the render hook emits the image
  Then the `Image` component carries that alt text verbatim
  And the same alt text remains available in the text stream

Scenario: blocked images leave text fully usable
  Test: test_image_hook_text_fallback
  Given images are blocked or unsupported in the terminal while prose and status tokens are present
  When the render hook handles a diagram-positive result
  Then the text stream still contains the full prose and alt text with no missing content or image-only output
  And the hook degrades cleanly without throwing or blanking the transcript

Scenario: negative — hook makes no format or verdict decision
  Test: test_image_hook_no_policy_logic
  Given a policy result with no diagram, or a judge verdict suggestion requesting one
  When the render hook handles that input
  Then it emits text only and no `Image` component
  And `extensions/index.ts` contains no policy/chooser/verdict evaluation and no markdown image syntax
</arg_value:6124c78e></tool_call:6124c78e></tool_calls:6124c78e>
