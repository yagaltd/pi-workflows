# Review — task-6

## Round 1 — 20261117 · reviewer

- Verdict: **ok: true** (with a flagged contract note: the spec's verify line `docs-lint && just ci`
  could not be green inside the boundaries — 1008 markdownlint findings, 947 in forbidden paths).
- Merged: three tool pins + per-section outcome accounting (ran / advisory / failed / skipped,
  four summary lines, `CLEAN — … with N section(s) not run`).

## Round 2 — 20261117 · reviewer

- Verdict: **ok: false**
- Finding [P0|P1]: the lychee lane **flaked** — on an untouched tree the gate exited 1 with
  `README.md: 3 finding(s), budget 2 — increased`; the extra entry was npmjs answering
  `403 Forbidden` to a non-browser client. The two-attempt per-file minimum failed because the
  403 is sticky within a run. Orchestrator reproduced the root flakiness directly:
  `lychee --format json README.md` ×3 → 0, 1, 0 occurrences.
- Everything else passed: 7/7 scenarios, ratchet pass/fail, byte-identical baseline `d32890d5…`,
  unusable-tool detection, durable record corrected, `just ci` exit 0.
- Orchestrator action: amended the contract with a deterministic rule ("anti-bot 403 is never
  debt": documented host list, printed drop, 404/5xx still fail) instead of more retries.

## Round 3 — 20261117 · reviewer

- Verdict: **ok: true**
- Five consecutive runs on the untouched tree: `0 0 0 0 0`, lychee residual 2 every time.
- A deliberate 404 still fails, naming the link (not just the file); the anti-bot rule does not
  apply to it. Budget stayed 2 — no entry raised, no URL excluded wholesale.
- Durable record now documents the rule, both conditions, the host list, the measured 0/1/0
  flakiness, "sticky within a run", "a second attempt cannot make a run reproducible", and
  "after the rule landed it fired in 5/5 runs".
- Baseline sha moved `d32890d5…` → `4f5a5061…` because harper is now tree-measured (1122→1121,
  idea.md 2→1) — a tightening; `--write-baseline` is byte-identical from there.
- Verify line run verbatim: `bash scripts/docs-lint.sh && bun test` → exit 0; `just ci` exit 0.
- Notes (non-blocking, for SHIP): `docs/architecture.md:421-424` still describes docs-lint as
  "five sections" with no ratchet — stale, and forbidden to this task.
