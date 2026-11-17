spec: task
name: restart-digest-resolves-caller-repo
tags: [bugfix, restart, digest]
verify: "bun test && bash scripts/check-drift.sh"
max-rounds: 2
---

## Intent

`/restart`'s digest must describe the repository the caller is standing in. Today
it describes the repository the script lives in, and the prompt only works when
cwd is the pi-workflows checkout — so a bootstrapped project gets either a dead
command (exit 127) or, worse, a confident report about someone else's repo.

## Decisions

- Root resolution is cwd-first: `git rev-parse --show-toplevel` wins when that
  root contains `.workflows/`; the script-dir walk-up stays as the fallback for
  the pi-workflows checkout itself; no root resolves → loud `FAIL`, exit 1.
- `--root <dir>` overrides both, for callers that know where to look.
- The prompt states the rule: use the repo's own `scripts/resume-digest.sh` when
  it exists, otherwise the installed package copy, and always against the cwd.

## Boundaries

### Allowed Changes
- scripts/resume-digest.sh
- prompts/restart.md
- tests/resume-digest.test.ts
- docs/architecture.md
- README.md

### Forbidden
- Any other script, prompt, skill, agent or extension
- Changing what the seven digest sections report, once the root is resolved
- Adding a dependency (no node/deno requirement in the shell path)

## Completion Criteria

Scenario: a foreign repo is digested from a foreign cwd
  Test: test_foreign_repo_plan_is_reported_from_foreign_cwd
  Given a temp git repo with `.workflows/plan.md` naming a plan id
  When the package copy of the digest runs with that repo as cwd
  Then the plan id appears in the output
  And the pi-workflows checkout's plan is never mentioned

Scenario: the pi-workflows checkout keeps its existing behaviour
  Test: test_package_repo_behaviour_unchanged
  Given cwd is the pi-workflows checkout
  When the digest runs
  Then it reports that repo's state (no live plan after plan 064 shipped)
  And exit code is 0

Scenario: a non-git cwd fails loudly
  Test: test_non_git_cwd_fails_loudly
  Given a directory that is not a git repo and no --root
  When the digest runs
  Then it prints a FAIL line naming the situation
  And exits non-zero without printing any repo's state

Scenario: --root overrides the cwd
  Test: test_root_flag_overrides_cwd
  Given a foreign repo passed as --root while cwd is elsewhere
  When the digest runs
  Then it reports the --root repo's plan id

Scenario: the prompt states the resolution rule
  Test: test_restart_prompt_states_the_resolution_rule
  Given prompts/restart.md
  When it is read
  Then it names the repo-local script first, the package copy second
  And it says the digest targets the repo you are standing in
