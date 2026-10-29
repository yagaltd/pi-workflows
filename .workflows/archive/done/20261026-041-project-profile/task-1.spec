spec: task
name: "profile-lint-repo-adoption"
tags: []
---

## Intent

Land the project-profile artifact and its lint: (1) `.workflows/profile.json` — machine-readable project facts (commands, pointers, tree domains, gates, scaffolds, meta stamps), written for THIS repo and tracked (gitignore negation, the LOG precedent); (2) `scripts/profile-lint.sh <profile.json>` — schema presence, pointer/tree path existence, command resolvability, gate script existence, stamp budget — one `FAIL:` per violation, non-zero exit; (3) `scripts/check-drift.sh` section 9 runs it with FAIL accounting.

## Decisions

- Schema (checked by the lint): `commands.test` + `commands.lint` required (`build` optional); `pointers` (≥ 1, each a repo path); `tree` (≥ 1 domain: name + path); `gates` (≥ 1, each a path under `scripts/`); `scaffolds` (object, may be empty `{"kinds":{}}`); `meta.generated_by` + `meta.generated_at` + `meta.stale_after` (stale_after ≥ generated_at, ISO dates).
- Existence checks: every `pointers.*` and `tree.*.path` value must exist on disk (`test -e`, resolved from the repo root — the repo root is the parent of the profile's dir, walking up to `.git` like agents-lint does).
- Command resolvability: the first word of `commands.*` must pass `command -v`.
- Gate check: each `gates[]` entry must exist as a file under `scripts/`.
- Stamp budget: `stale_after` must be ≤ 35 days after `generated_at` and in the future relative to today.
- Repo profile content: commands (bun test; docs-lint), pointers (canon, docs-policy, registry, adr INDEX, execution-doctrine), tree domains (extensions, prompts, skills, templates, scripts, tests), gates (check-drift, docs-lint, agents-lint), scaffolds empty, meta by `init --adopt`.

## Boundaries

### Allowed Changes
- scripts/profile-lint.sh
- .workflows/profile.json
- .gitignore
- scripts/check-drift.sh

### Forbidden
- Do not touch `skills/**` (TASK 2 scope), `extensions/**`, `AGENTS.md`, `templates/**`, CHANGELOG/package.json (TASK 3 scope).
- Do not modify existing check-drift sections 1–8 — add section 9 only.

## Completion Criteria

Scenario: profile lint passes the repo profile
  Test: bash scripts/profile-lint.sh .workflows/profile.json
  Given the repo profile after the change
  When profile-lint runs on it
  Then it exits 0

Scenario: profile lint rejects a dead pointer
  Test: cp .workflows/profile.json /tmp/p41-dead.json && sed -i 's|docs/canon.md|docs/no-such.md|' /tmp/p41-dead.json; if bash scripts/profile-lint.sh /tmp/p41-dead.json; then exit 1; fi
  Given a profile copy with one pointer retargeted to a nonexistent path
  When profile-lint runs on it
  Then it exits non-zero

Scenario: profile lint rejects a dead command
  Test: cp .workflows/profile.json /tmp/p41-cmd.json && sed -i 's|"bun test"|"nope test"|' /tmp/p41-cmd.json; if bash scripts/profile-lint.sh /tmp/p41-cmd.json; then exit 1; fi
  Given a profile copy whose test command first word does not resolve
  When profile-lint runs on it
  Then it exits non-zero

Scenario: drift section runs the lint
  Test: bash scripts/check-drift.sh 2>&1 | grep -q "profile-lint"
  Given check-drift after the change
  When it runs
  Then section 9 invokes profile-lint and appears in the output

Scenario: stamps enforced
  Test: cp .workflows/profile.json /tmp/p41-stale.json && sed -i 's/2026-11-28/2026-01-01/' /tmp/p41-stale.json; if bash scripts/profile-lint.sh /tmp/p41-stale.json; then exit 1; fi
  Given a profile copy with an expired stale_after
  When profile-lint runs on it
  Then it exits non-zero
