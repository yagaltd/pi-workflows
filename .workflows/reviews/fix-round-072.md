# Fix round — task-1 (plan 072, docs currency + baseline regen)

## Round 1 — reviewer pw72-t1 · ok: false

- [P0] bun test red IN THE COMMITTED STATE: the determinism pin's truth-leg
  (`lowered > 0`) compared the committed baseline against literal
  `git show HEAD:` — after committing the regen, HEAD contains the lowering,
  so `lowered` structurally reads 0 and the suite can never pass. The
  worker's 445/0 evidence was honest and pre-commit; the assertion was
  git-state-coupled. New defect class on record: green pre-commit,
  structurally red post-commit.
- Scope note: the reviewer short-circuited at step 1; steps 2-6 unexecuted.

## Fix round R1 remedy (orchestrator, reviewer-prescribed)

- Truth-leg reference anchored: `BASE_REF = "5acf35e"` (the pre-regen
  snapshot) with the why-comment at the pin; all HEAD-based truth-leg reads
  replaced. Commit 68d6c12 on the branch; 436/0 in the committed state.

## Round 2 — reviewer pw72-fixrev · ok: true

- Round-1 failure condition CURED: 436/0 committed-state (throwaway repo from
  `git archive 68d6c12` + update-ref — no checkout needed; method recorded).
- Round-1 steps 2-6 executed clean: README companion truthful and
  non-dependency; FILES-STAY-CLEAN zero violations; baseline 4 lowered /
  0 raised + determinism; DOCS-POLICY cross-ref + budgets-track-truth landed;
  scope exactly the 6 Allowed paths; forbidden files absent; drift/gen-docs
  CLEAN.
