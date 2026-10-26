# Review — task-1 (eval-golden runner + dispatch probe)

## Round 1
**ok: true**

Evidence:
- `bun test` → 130 pass / 0 fail across 6 files (15 new runner/probe tests).
- Probe executes the real `resolveNext` (extensions/index.ts import); fixture dispatch-wave-order.json → {ok:true, id:"task-1", wave:1}.
- Flip semantics: stable pass→fail exits 1; `--accept-flip` exits 0; fail→pass = fixed; run-twice disagreement = flaky, never a verdict.
- Zero deps; no live model calls; bun absence would mark dispatcher cases skipped, never silently dropped.

Gaming check: tests assert runner behavior via temp fixtures + the shipped probe — no test reads its own expectation.
