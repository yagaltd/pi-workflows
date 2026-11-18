# Review + fix round record — plan 069

## Task 1 (agent-spec lint per-file continue) — reviewer as69-t1 · ok: true

- Independent /tmp reproduction (bad+valid+bad → both named, valid reported);
  src/spec_lint + src/spec_verify diffs EMPTY; roadmap exclusion documented,
  not code-changed; scope exactly the 7 Allowed paths; lifecycle 3/3.
- rust-review consulted per the domain-skill doctrine (no findings).
- Bonus: the worker corrected plan-067's truncated count en route (48/49
  processed post-fix; the one unparseable file named).

## Task 2 (tdd-guard verify binding + shared discovery) — reviewer tg69-t2 · ok: false → resolved

- R1 findings:
  1. [P1, in-scope] cc-check format FAIL — the worker's `@cc [label:x] name`
     directives are grammar-invalid, and adding any @cc activated a previously
     silent gate (repo had zero @cc at HEAD, no CONTRACTS workflow).
     Remedy (orchestrator, subtract-first): the 4 directive lines REMOVED,
     prose kept; zero-@cc invariant restored; vitest 24/24 + tsc + build green
     after. The six-rule and discovery semantics untouched.
  2. [P1, external routing] agent-spec guard exit 2 on both task specs —
     `looks_like_path_boundary` cannot express bare root filenames (min-repro:
     `./README.md` PASS, `README.md` FAIL). ORCHESTRATOR ADJUDICATION
     (precedent plan-064 spec correction): both task specs amended to `./`
     prefixes — syntax accommodation, semantics identical; guard now
     "1 spec(s) passed" on both worktrees. The matcher fix itself stays
     QUEUED (P2) — it is rule code in agent-spec, contract-forbidden here.
- Both workers independently surfaced the same matcher gap (T1 lifecycle
  false-positive, T2 guard failure) — the queued batch row is fully specified
  by two implementations of the repro.

## Triage-defect record (owner: orchestrator)

Plan-067's 12→5 triage DROPPED the bare-filename matcher row (067 carry-in
row 2). It resurfaced live in 069 via two workers. Lesson recorded: triage
dispositions are auditable — a row may only leave the ledger via done /
closed-with-why / batched-into, and batch targets must name their members.
The row is restored as the ship ledger's single queued P2.


---

# Addendum — rust-binding fix round (20261117, executed under plan 070's window)

## Reopening

Post-merge review of plan 070 (agent-spec 0.3.4) surfaced tdd-guard verify
reporting all 7 selectors `found:false` on the real agent-spec repo —
reopening this task's rust-binding row. Root cause (orchestrator-verified):
0.1.3's match predicate was exact Set membership, but src-colocated rust
tests list with full module paths; 0.1.3's closure proof used an
integration-test fixture whose bare names masked the gap. The 069 closure was
premature — owned here on the record.

## Fix round (tg70-fix) — reviewer tg70-fix-reviewer · ok: true

- Predicate: exact OR `::`-anchored suffix (`endsWith("::" + selector)`);
  negative pin proves prefix selectors cannot overmatch (isolated fixture
  crate); E2E against the REAL agent-spec repo: 6 code pins `found:false →
  found=true`, exit loud; delta vs base exactly as specified.
- Fix-round hygiene (orchestrator, subtract-first — same remedy as this
  file's R1): the worker's new `@cc` doc-marker removed; the repo carries no
  CONTRACTS workflow and the marker re-armed a format-unverified gate.
- 0.1.4 merged + pushed; global binary current.

## Adjudication items (from the 070 review — dispositions)

1. `clippy_fmt_clean` selector binds no real test → contract-authoring note
   for rust specs: clippy/fmt are verify-line-governed; bind real tests or
   omit the selector. Recorded; applies to future contracts.
2. tdd-guard rust layout support → CLOSED by this fix round (the row this
   addendum reopens and re-closes with the real-repo proof).
3. Presence-guarded runner tests inert in sandboxed processes → info,
   batched if a future runner-absence plan opens.
4. Repo-wide guard fails on 8 frozen archived specs → pre-existing, FROZEN by
   decision (docs/frozen-specs.md), no action.

## Ledger state at v0.15.6

EMPTY — zero queued, zero deferred, zero triggers. First empty ledger since
the ledger existed (20261031-047 lineage).
