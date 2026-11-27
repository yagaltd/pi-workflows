# Review — task-2
Task: Init formatter profile detection/offer · Contract: .workflows/specs/task-2.spec

## Round 1 — 2026-11-27 · reviewer

**ok: false**

Two P1 findings: Markdown-only formatter drafts emitted a formatter SKIP; schema FAIL plus missing tool returned exit 3, masking the documented exit-1 FAIL signal.

## Round 2 — 2026-11-27 · fix

**ok: true**

Evidence: lifecycle PASS 5/5; tdd-guard lint/verify PASS; 31 tests pass / 0 fail; check-drift CLEAN; boundary tripwire OK. Markdown-only drafts emit no formatter verdict; exit precedence is FAIL→1, SKIP-only→3, clean→0; combined case pinned by test. No findings.
