spec: task
name: "contracts-preamble-fix"
tags: [cc-check, contracts, lint]
verify: "cc-check format"
---

## Intent

Make `cc-check format` exit 0 on the root CONTRACTS file: the prose "Scope:" line at line 1 must move into a form cc-check accepts, with every existing @cc directive preserved.

## Decisions

- Probe first: cc-check's comment tolerance is unknown — test candidate forms (`#`, `//`, blank-line separation) against `cc-check format` in a scratch copy before choosing.
- The Scope sentence must survive somewhere: either an accepted comment form in CONTRACTS or relocated to docs/ with a pointer — worker reports which.
- Directive count and body text of every @cc block stay byte-identical.

## Boundaries

### Allowed Changes
- CONTRACTS
- docs/** (only if the Scope prose relocates there)

### Forbidden
- Do not modify any @cc directive body
- Do not touch .workflows/, scripts/, tests/
- Do not install or upgrade cc-check

## Completion Criteria

Scenario: cc-check format is clean
  Test: cc-check format
  Given the edited CONTRACTS
  When running cc-check format
  Then exit 0 — no finding at CONTRACTS:1:1 or anywhere

Scenario: all directives preserved
  Test: test "$(grep -c '@cc \[label:' CONTRACTS)" -ge 3
  Given CONTRACTS after the edit
  When counting directives
  Then the @cc directive count is >= 3 and every directive body is byte-identical to HEAD

Scenario: scope rule survives relocation
  Test: grep -qE 'Scope: code-local invariants' CONTRACTS || grep -rq 'Scope: code-local invariants' docs/
  Given the edited files
  When searching for the scope rule
  Then it exists in an accepted comment form or in docs/

Scenario: negative — new prose before directives fails
  Test: cp CONTRACTS /tmp/c47bak; printf 'narrative line\n' >> CONTRACTS; cc-check format >/dev/null 2>&1; ec=$?; cp /tmp/c47bak CONTRACTS; rm -f /tmp/c47bak; test $ec -ne 0
  Given cc-check rejects non-directive prose
  When appending a narrative line to a scratch copy and running cc-check
  Then cc-check exits non-zero — proving the lint still guards the format; the real file is restored from the backup before the check completes
