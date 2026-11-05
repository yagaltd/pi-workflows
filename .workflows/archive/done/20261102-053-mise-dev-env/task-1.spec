spec: task
name: init-dev-environment-mise
tags: [init, mise, doctrine, tdd]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

/init Phase 5 gains step 7 **"Dev environment (mise)"**: detect the project's stack + existing version files, suggest a project-scoped mise.toml at the human gate (greenfield) or report native pinning + offer consolidation (brownfield), write + verify. Model policy renumbers to step 8, handoff to 9.

## Decisions

- DETECT: stack markers (package.json, Cargo.toml, pyproject.toml, go.mod, Gemfile, *.csproj) + version files (.nvmrc, .python-version, .tool-versions, mise.toml).
- GREENFIELD: generate mise.toml `[tools]` pinned from markers + `mise current`; 🛑 human gate; write; `mise install`; verify `mise exec -- <runtime> --version`.
- BROWNFIELD: report "already pinned — mise reads these natively as-is"; consolidation is an OFFER, never forced.
- BOUNDARIES (three lines, pinned): never delete existing version files; never upgrade runtimes just to enable it; never silently replace another tool manager.
- mise missing on machine → suggest `curl https://mise.run | sh`, skip LOUDLY, init continues.
- Handoff (renumbered 9) reports the dev-environment outcome alongside the model-policy outcome.
- T2's Model-policy pins (prompt-doctrine.test.ts T3 describe) renumbered step 7→8 mechanically (justified pin update).

## Boundaries

### Allowed Changes
- skills/init/SKILL.md
- tests/prompt-doctrine.test.ts (extend + mechanical renumber)

### Forbidden
- Do not modify agents/registry.md, agents/worker.md, agents/reviewer.md, agents/execution-doctrine.md, prompts/, templates/, mise.toml (T2's file)
- Do not change the Charter probe (step 6) or the never-key-files rule

## Completion Criteria

Scenario: dev-environment step documented
  Test: step 7 pinned with detect/gate/verify wording
  Given skills/init/SKILL.md after the edit
  When the T6 pin test reads it
  Then step 7 "Dev environment (mise)" exists: stack detection, version-file detection, human gate, mise install + runtime version verify

Scenario: renumber correct
  Test: Model policy is step 8, handoff is step 9
  Given the SKILL after the edit
  When the (updated) pins read it
  Then Model policy = step 8, handoff = step 9 reporting BOTH outcomes, charter probe still step 6

Scenario: boundary lines pinned
  Test: three boundary lines present
  Given the SKILL
  When the T6 pins read it
  Then never-delete-version-files, never-upgrade-runtimes-unasked, never-replace-tool-manager lines are present

Scenario: mise-missing path pinned
  Test: loud skip line present
  Given the SKILL
  When the T6 pins read it
  Then the mise-absent → suggest installer → skip loudly → init continues line is present

Scenario: existing pins stay green
  Test: full suite green
  Given all edits
  When bun test runs
  Then 0 fail (roleBody, tier pins, proof-docs, T2/T3 describes all intact)
