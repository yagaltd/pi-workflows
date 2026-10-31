spec: task
name: "suite-state-hardening"
tags: [tests, fixtures, state]
verify: "p=/tmp/pw47probe-$$; git worktree add --detach $p HEAD >/dev/null 2>&1 && cd $p && bun test >/dev/null 2>&1; ec=$?; cd - >/dev/null; git worktree remove --force $p; test $ec -eq 0"
max-rounds: 3
---

## Intent

Make `bun test` pass on a tracked-files-only checkout (fresh clone, worker worktree): behavior tests run on fixture/synthetic state; live-consistency tests skip loud with a named reason when `.workflows/` live state is absent. The live checkout's suite stays green and unchanged in count.

## Decisions

- Mixed mode per owner-vetoable plan decision: fixtures/synthetic state for behavior tests; loud named skips for live-consistency tests. Neither mode may delete assertions.
- Mechanism: a shared helper (e.g. `tests/state-helpers.ts`) exposes `requireLiveState(<what it would check>)` — warns to stderr with the exact missing check, then `test.skip`. Every state-dependent suite routes through it.
- Skip format is pinned: the warning contains `SKIPPED (state absent): <what>`. Reviewer greps fresh-worktree output for unexplained skips.
- No new dependencies. bun test runner unchanged. Live-checkout behavior must stay byte-compatible: 225/0 before and after (count may grow, never shrink below current).

## Boundaries

### Allowed Changes
- tests/**

### Forbidden
- Do not modify justfile, scripts/, prompts/, src logic, package.json
- Do not delete or rename existing test files or weaken existing assertions
- Do not commit .workflows/ state or add it to gitignore whitelist
- No silent skips: any skip must carry the pinned reason format

## Completion Criteria

Scenario: fresh worktree suite is green
  Test: p=/tmp/pw47s1-$$; git worktree add --detach $p HEAD >/dev/null 2>&1 && cd $p && bun test >/dev/null 2>&1; ec=$?; cd - >/dev/null; git worktree remove --force $p; test $ec -eq 0
  Given a tracked-files-only worktree (no gitignored .workflows state)
  When the full suite runs there
  Then exit code is 0 — zero failures, zero ENOENT

Scenario: live checkout suite stays green
  Test: bun test 2>&1 | tail -2
  Given the gating checkout with its live state
  When the full suite runs
  Then 0 fail — the count never drops below the pre-change 225

Scenario: skip mechanism exists and is pinned
  Test: grep -q 'requireLiveState' tests/state-helpers.ts && grep -q 'SKIPPED (state absent)' tests/state-helpers.ts
  Given the shared helper file
  When inspecting it
  Then it defines requireLiveState and emits the pinned skip format with the named check

Scenario: state-dependent suites route through the helper
  Test: test "$(grep -l requireLiveState tests/*.test.ts | wc -l)" -ge 8
  Given the wiring-family suites that read .workflows state
  When counting adopters
  Then at least 8 test files call requireLiveState

Scenario: negative — no silent skips in fresh worktree output
  Test: p=/tmp/pw47s5-$$; git worktree add --detach $p HEAD >/dev/null 2>&1 && cd $p && bun test 2>&1 | grep -E '\\(skip|skipped)' | grep -qv 'state absent'; ec=$?; cd - >/dev/null; git worktree remove --force $p; test $ec -ne 0
  Given the fresh worktree run
  When scanning skip lines
  Then every skip line carries the state-absent reason — a reason-less skip fails this check
