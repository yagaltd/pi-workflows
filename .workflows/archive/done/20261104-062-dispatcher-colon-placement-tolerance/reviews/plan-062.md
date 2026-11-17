# Review — plan 20261104-062 (dispatcher colon-placement tolerance + grammar pin)

- Verdict: **ok: true** (orchestrator-inline, Tier A — worker TDD RED→GREEN, merged e911177)
- Worker: pw64-colon-tolerance (run_mw3dqcxq_aggf4r/task_1); surgical +19/−10
- Verified on main post-merge: suite **385 pass / 0 fail** (3 dispatch-parse tests + 4 T12 pins added); drift CLEAN; docs-lint 12 gates CLEAN (README untouched — gen-docs in sync)
- T1: parseTaskBullets seam (regex accepts colon inside OR outside bold), parsePlan consumes it; canonical-form golden regression identical; bare-text bullets stay unparsed; CONTRACT-FORMAT.md gains the plan TASK bullet grammar section (first plan.md-side pin); plan SKILL references it
- Advisory resolution (raised at gate per instruction): [pi-workflows supersede] adr-contract-file/DEC-xxx — **no-action**. DEC-002 "Flows compile onto resolveNext" (scope scripts/flow-*.mjs, revisit-when dispatcher contract changes shape) is NOT superseded: plan-062 widened resolveNext's input tolerance, changed no scheduler structure; flows still render house plan text and dispatch through the one resolveNext. DEC-002 stands active.
- Root cause (source trial): visual-agent-frontend hand-authored plan used `- **Allowed:**` exclusively; parser was strict canonical-only → empty allowed/verify. Grammar now pinned in CONTRACT-FORMAT (first plan.md-side pin) + plan SKILL + T12.
