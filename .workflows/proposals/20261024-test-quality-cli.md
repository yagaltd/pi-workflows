# Proposal: test-quality CLI decision (tdd-gate vs tdd-guard)

- Date: 2026-10-24
- Status: PROPOSAL — decision required, nothing built
- Origin: owner-cancelled plan 012 (bundle split); salvage of its tdd-gate half. Prior evidence: plan 012 probe (`agent-spec parse --format json` exposes scenarios + `test_selector`), T7p trust-test (Jev GO advisory-only, thresholds noul 0.85 / choice 0.90), post-v0.6.1 architecture proposal layer map.

## Decision required

Pick ONE Layer 2 (test-quality checks) CLI for the build pipeline:

| Candidate | Nature | Notes |
|---|---|---|
| `tdd-gate` (vibe/tdd-gate) | Jev-native: coverage, blame, gaming, weakening, drift | Candidate gate. Own key; would become the only Jev consumer |
| `tdd-guard` fork `lint` | Deterministic, free, parse-only smells | Pre-filter / matrix-shrinker only — never a gate |

Existing design notes lean: tdd-gate = THE gate; tdd-guard = optional pre-filter. This proposal forces the single verdict.

## Constraints

- One verdict, one plan. The auto-gate hook (backlog item 2) targets the winner.
- If tdd-gate wins: it becomes the only Jev consumer; no other judgment aid overlaps its scope.
- If tdd-guard wins: gaming/weakening/drift stay uncovered — record accepted risk.

## Output

Plan 013 (next `/plan`) states the verdict in one line and wires it: pipeline step + reviewer procedure line + doc stamps where affected.
