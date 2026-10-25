spec: task
name: "extension-owner-routing-jev-seam-removal"
tags: []
---

## Intent

The pi-workflows extension's supersede advisory stops depending on probability routing. The advisory line names the `owner:` values found in the matched `@cc` contract's metadata as sign-off targets; when no `owner:` attribute exists, it emits the generic human-gate line. The exported Jev probability-routing seam (`supersedeAdvisoryLine` export + threshold logic) is removed — the advisory is static text derived from contract metadata only. Tests cover owner parsing and prove the seam is gone.

## Decisions

- Parse `owner:` from `@cc […]` directive attributes the same way `adr:`/`id:`/`label:` are parsed today (same extraction path, same `◆` block walk via `cc-check list`).
- Multiple `owner:` values ⇒ all are named, comma-separated, in contract order.
- No `owner:` ⇒ exact existing generic human-gate wording (unchanged text).
- `supersedeAdvisoryLine` export and its threshold logic are deleted; no replacement export. Callers in this repo are updated; nothing else imports it (verified by test suite + grep).

## Boundaries

### Allowed Changes
- extensions/index.ts
- tests/extension.test.ts

### Forbidden
- Do not change watchdog trigger conditions (adr:/Decisions-diff mechanics stay as shipped).
- Do not add dependencies.
- Do not alter `agents/*`, `prompts/*`, or README in this task.

## Completion Criteria

Scenario: advisory names owner sign-off target
  Test: advisory names owner sign-off target
  Given a changed file carrying an `@cc` contract with `owner:alice` metadata that fires the supersede watchdog
  When the advisory line is built
  Then the line names alice as the sign-off target
  And the line does not contain any probability or threshold text

Scenario: generic line when owner absent
  Test: generic human gate line when owner absent
  Given a fired contract without an `owner:` attribute
  When the advisory line is built
  Then the exact legacy generic human-gate wording is emitted

Scenario: Jev probability seam removed
  Test: supersedeAdvisoryLine export is gone
  Given the built extension module
  When the module namespace is inspected
  Then no `supersedeAdvisoryLine` export exists
  And the full test suite passes with the new owner-parsing cases
