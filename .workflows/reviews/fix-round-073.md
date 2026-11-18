# Review record — plan 073

## Task 1 (sieve doctrine, pi-workflows) — reviewer pw73-t1 · ok: true (first pass)

- Gate block md5-IDENTICAL across idea/plan/add-feature/prototype (pinned via
  shared SIEVE_GATE const — the single-source pattern applied to doctrine
  text). Enums + pure outcome rules match the normative grammar. Obligation
  exemption inside the block; obligation skills untouched (pin-asserted).
- Budgets held with zero offsets (harper-clean prose patterns from 072
  applied preemptively). 451/0 on merged master.

## Task 2 (plan-check Sieve grammar, agent-spec) — reviewer as73-t2 · adjudicated

- R1 verdict ok:false on TWO findings, both external to the worker's diff
  (zero defects found in it): (F1) tdd-guard lint blind to rust — routed to
  TASK 3 (dispatched same session); (F2) task-2.spec's `clippy_fmt_clean`
  selector unbindable — CONTRACT AMENDED by the orchestrator (verify-line-
  governed, precedent plan-064 spec corrections; the fix-round-069 authoring
  note applied to our own spec authoring, third instance).
- Merged as-is; 0.3.5 pushed + installed. Reproductions verified by the
  reviewer in /tmp (park → exit 1 naming the ledger rule; V=must → named
  cell error; absence → no-op; real pi-workflows plan → no-op).

## Task 3 (tdd-guard rust classification) — reviewer tg73-t3 · ok: false → fix round → ok: true

- R1 findings: F1 [P1] `tsc_and_build_clean` selector unbound (spec authored
  by orchestrator — the fix-round-069 authoring note missed again; remedy:
  tests/gates.test.ts BINDS it for real, runs the gates, 1485ms); F2 [P2] 5
  lint violations in pre-existing tests/fixtures/** (fixture-shaped data
  swept by discovery).
- R1 also short-circuited at Layer 2 — Layer 3 steps executed only in R2.
  Lesson recorded: a reviewer short-circuit leaves the pipeline unexecuted;
  the re-review must run the skipped steps, not just the fix.
- R1 remedy (orchestrator): worker's staged diff committed as-authored
  (c29971f-lineage), then EXCLUDED_SEGMENTS gains "fixtures" (segment-scoped
  — scans rooted inside a fixtures dir still work) and tests/gates.test.ts
  added. R2 reviewer ok:true: 31/31 pins; own-repo lint exit 0/0 errors
  (was exit 1/5); stale-binary delta reproduced; real agent-spec run exit 0 +
  SKIPPED-RUST (was exit 1); scope exact; rules/parser 0 diff.
- 0.1.5 merged (75aba82-lineage → final), pushed, global binary current.

## New queued rows (triaged — repo-theme batches, P3)

1. tdd-guard language-coverage batch: SKIPPED-PY classification (same defect
   class as pre-fix rust), discovery rust pattern can't match from inside a
   test dir (blocked by F3), package-lock root version sync — batched, queued.
2. tdd-guard parser batch: conditional-test idiom (`test.skipIf(...)(name,
   fn)`) misread as anonymous assertionless call — 11 false positives on
   pi-workflows' real suite (verified: the tests carry full assertions) —
   P3/M, queued. Parser semantics = delicate; own task.
3. agent-spec docs batch: plan-check and its validated sections (Dependencies,
   Ledger Resolution, Bottleneck, Sieve) have no docs/ page — P3/S, queued.
