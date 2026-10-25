# Verdict — TASK 4 (worker rule — @cc on new/changed public seams)

- Plan: 20260919-010
- Reviewer: t4r2 child (fresh re-verification, openrouter/~deepseek/deepseek-flash-latest — first alias-pin dispatch)
- Date: 2026-09-19
- Branch: subagents/run_mu9mzoqg_zw721s/t4w (commit 683bb9c) → merged --no-ff as a30ea72

## Verification: PASS

### Layer 1b: boundary
- diff --name-only 1ad5d2df..t4w = agents/worker.md only — PASS

### Layer 3: project
- cc-check format on branch tree: rc 0 — PASS

### Spec scenarios: 5/5 PASS
- @cc rule present with concrete example — PASS
- adr: attribute documented — PASS
- invariant (durable-vs-ephemera division) in scope — PASS (worker.md:111-115, new "### Annotate public seams with @cc" subsection)
- "Applicable contracts" exact-title cross-ref — PASS
- Domain Memory (mandatory section intact) — PASS (negative)

### Tooling note (honest limitation, not a defect)
- agent-spec lifecycle on this spec returns all-skip: its verifier model expects test-function selectors, our docs-task specs carry shell grep Test: selectors — selectors executed directly instead. Recorded as improvement candidate for agent-spec upstream (`--shell-selectors` mode or docs-spec profile).

## Verdict

**ok: true**
