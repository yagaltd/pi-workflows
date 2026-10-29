# Final gate chain — plan 20261026-044 (executor run, FULL unfiltered raw output)
- Executed: 2026-10-29T11:58:24Z · HEAD: dab1c699fa446ccca41b425d168e27103d665b49

== ALL GATE OUTPUT (no filtering — plan-040 lesson) ==

--- T1 artifacts ---
170 scripts/metric-gates.sh
profile metrics OK

--- metric gate runs ---
skip: complexity — crapper not installed
skip: duplication — dryer not installed
DEFAULT_EXIT=0
MUTATION_FLAG_EXIT=0

--- T2 artifacts ---
README OK
CHANGELOG OK
version OK

--- gate chain: check-drift (full) ---
== 1. Prompt frontmatter: only supported keys (description, argument-hint, hidden) ==
ok:   no dead frontmatter keys in prompts/
== 2. Removed-extension API remnants + dead integrations ==
ok:   no old-API remnants, no dead integrations, no stale fork pointers
== 3. Roles: files exist, registered, and every @role: ref resolves ==
ok:   role files present, registered, @role refs resolve
== 3b. Skill references/ modules resolve ==
ok:   skill reference modules resolve
== 3c. Extension ships and is registered ==
ok:   extension present and registered
== 4. Skills referenced by prompts exist ==
ok:   skill references resolve
== 5. Templates referenced by skills exist ==
ok:   template files present
== 6. peerDependencies pin the current engine ==
ok:   peerDependencies include pi-core-subagent
== 7. Commands in README command table exist as prompts ==
ok:   README commands resolve to prompt files

== 8. agents-lint — AGENTS.md doctrine (core + pointers + budget) ==
ok:   AGENTS.md passes the doctrine lint

== 9. profile-lint — project profile (.workflows/profile.json) ==
ok:   .workflows/profile.json passes the profile lint

== 10. metric-gates — complexity + duplication (no mutation) ==
skip: complexity — crapper not installed
skip: duplication — dryer not installed
ok:   metric-gates clean (violations absent or tools skipped)

CLEAN — no drift.
DRIFT_EXIT=0

--- gate chain: docs-lint ---
DOCSLINT_RC=0

--- gate chain: bun ---
 970 expect() calls
Ran 225 tests across 34 files. [3.28s]

--- gate chain: selectors ---
SEL_RC=0

--- gate chain: cc-check ---
CC_EXIT=1
.workflows/spikes/jev-trust/merge.py
.workflows/spikes/spec-sanity/merge.py
CONTRACTS
extensions/index.ts
scripts/eval-dispatch-probe.ts
tests/budget-wiring.test.ts
tests/chooser-wiring.test.ts
tests/closeout-queue.test.ts
tests/closeout-wiring.test.ts
tests/closeout.test.ts
tests/decision-docs.test.ts
tests/decisions-docs.test.ts
tests/decisions.test.ts
tests/dispatch-ledger.test.ts
tests/eval-golden.test.ts
tests/extension.test.ts
tests/flows-decision.test.ts
tests/flows-examples.test.ts
tests/flows-gates.test.ts
tests/flows-run.test.ts
tests/flows-validate.test.ts
tests/format-chooser.test.ts
tests/golden-set.test.ts
tests/intent-guard.test.ts
tests/intent-hook.test.ts
tests/intent-wiring.test.ts
tests/judge.test.ts
tests/lessons-docs.test.ts
tests/lessons-prompt.test.ts
tests/lessons.test.ts
tests/models-scan.test.ts
tests/proof-collect.test.ts
tests/proof-docs.test.ts
tests/proof-ledger.test.ts
tests/queue-wiring.test.ts
tests/run-journal.test.ts
tests/ship-wiring.test.ts
tests/spec-selectors.test.ts
tests/tier-wiring.test.ts
cc-check: CONTRACTS:1:1: error: Expected an @cc directive

--- plan markers ---
2
