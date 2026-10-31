spec: task
name: "pre-push-rewire-just-ci"
tags: [git-hooks, just, pre-push]
verify: "bash -n scripts/install-git-hooks.sh && grep -q 'command -v just' scripts/install-git-hooks.sh && grep -q 'just ci' scripts/install-git-hooks.sh && grep -q 'docs-lint.sh' scripts/install-git-hooks.sh"
---

## Intent

Rewire the optional pre-push hook generator so a push runs the full local gate (`just ci`) instead of docs-lint alone, with a loud degradation path when `just` is absent.

## Decisions

- Hook body: `command -v just` probe first.
- just present → run `just ci`; its failure blocks the push.
- just absent → print an audible notice to stderr and fall back to `bash scripts/docs-lint.sh`; docs-lint failure still blocks the push. Degradation is loud, never a silent pass (doctrine: absent toolchain = loud skip with the binary named).
- The worker edits the generator script only; `.git/hooks/` is a runtime artifact the script writes when the owner runs it.

## Boundaries

### Allowed Changes
- scripts/install-git-hooks.sh

### Forbidden
- Do not modify justfile, ci.yml, or any other scripts/ file
- Do not commit or modify .git/hooks content in the diff
- Do not make the just-absent path a silent pass (no `|| true`, no `exit 0` swallowing)

## Completion Criteria

Scenario: generated hook runs the shared entrypoint
  Test: grep -q 'just ci' scripts/install-git-hooks.sh
  Given install-git-hooks.sh after the edit
  When reading the heredoc hook body
  Then it invokes just ci when just is present

Scenario: degradation path is probeable and loud
  Test: grep -q 'command -v just' scripts/install-git-hooks.sh && grep -q 'docs-lint.sh' scripts/install-git-hooks.sh
  Given install-git-hooks.sh after the edit
  When just is absent from PATH
  Then the hook prints a notice naming the missing binary and runs docs-lint.sh instead, and docs-lint failure still fails the hook

Scenario: generator stays syntactically valid
  Test: bash -n scripts/install-git-hooks.sh
  Given the edited script
  When bash -n parses it
  Then exit code is 0

Scenario: generated hook is executable and self-contained
  Test: bash scripts/install-git-hooks.sh && test -x .git/hooks/pre-push && bash -n .git/hooks/pre-push
  Given a clean hooks dir
  When the owner runs the generator
  Then .git/hooks/pre-push exists, is executable, and parses

Scenario: negative — degradation never swallows a failure
  Test: ! grep -q '|| true' scripts/install-git-hooks.sh && ! grep -q 'exit 0' scripts/install-git-hooks.sh
  Given just ci fails (or, degraded, docs-lint fails)
  When the hook finishes
  Then it exits non-zero so git refuses the push — no `|| true` and no `exit 0` swallow exists anywhere in the generator
