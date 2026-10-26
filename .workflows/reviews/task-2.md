# Review — task-2 (golden set v1)

## Round 1
**ok: true**

Evidence:
- 11 cases in .workflows/evals/golden/: 4 dispatcher (wave order; deps-unsatisfied; stale-status; missing-spec), 3 gate (lifecycle FAIL, gaming PASS, drift FAIL), 2 degradation (JUDGE SKIPPED marker format, advisory mode), 2 archive/docs (plan-id + changelog mention; stamp expiry).
- Fresh-baseline double run: 11/11 PASS both runs, 0 flaky, 0 flips, exit 0 (spec scenario).

Gaming check: expected values derived from shipped gate semantics (v0.8.0 blocked codes, v0.8.2 marker doctrine), not from runner internals.
