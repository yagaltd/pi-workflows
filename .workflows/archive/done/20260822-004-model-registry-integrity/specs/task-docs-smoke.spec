spec: task
name: "Docs + smoke (model registry + integrity hardening)"
tags: [docs, smoke, verification]
max-rounds: 2
---

## Intent

Document the new surfaces and prove them live: registry scan works against the real network,
fallback semantics behave, role tripwires are greppable. Honest PASS/FAIL per check.

## Decisions

- D6 (plan 20260822-004): README gains a **"Model registry"** section (why: no hardcoded ids;
  `node scripts/models-scan.mjs` to scan; edit `models/registry.json` prefs to change families/
  providers; offline keeps last resolutions; `@model:<role>` refs in dispatch) and a short
  **"Reviewer integrity"** note (bash non-optional; VOID rule; verify-after-edit rule).
- `.workflows/LOG.md`: plan-004 completion entry.
- SMOKE (5 checks, results recorded in LOG entry text — this repo has no browser layer):
  1. `node scripts/models-scan.mjs` (live network) → exit 0, registry shows 4 roles with
     pricing + resolvedAt timestamps.
  2. `node scripts/models-scan.mjs --fixture <the test fixture>` → deterministic, exit 0,
     registry roles match fixture expectations.
  3. Offline simulation (bad URL) → exit 1, WARN, registry byte-identical.
  4. `grep -c "VOID" agents/reviewer.md` ≥ 3 and `grep -n "post-edit" agents/worker.md` hit.
  5. `grep -c "@model:" agents/registry.md` ≥ 5 (table fully referenced).
- If the live network is unavailable during smoke: check 1 becomes SKIP with explicit
  "network unavailable" note — NOT a PASS; checks 2-5 must still pass.

## Boundaries

### Allowed Changes
- README.md
- .workflows/LOG.md
- (read-only smoke: no source changes)

### Forbidden
- Everything else — scripts/**, models/**, agents/**, tests/**, extensions/**, templates/**, prompts/**, package.json

## Completion Criteria

Scenario: README documents both surfaces
  Test: grep -n "Model registry" README.md && grep -n "Reviewer integrity" README.md
  Then both sections present; registry section mentions scan command + prefs editing + offline behavior; integrity section mentions VOID + verify-after-edit

Scenario: Smoke complete and honest
  Test: LOG entry lists 5 checks with PASS/FAIL/SKIP each
  Then no unrecorded checks; any SKIP carries its reason; any FAIL carries reproduction

Scenario: Repo suite green
  Test: npm test (or repo's runner)
  Then pre-existing suite state preserved or improved; new tests from T1 pass
