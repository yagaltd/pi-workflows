spec: task
name: "Reviewer VOID tripwire + worker verify-after-last-edit"
tags: [reviewer, integrity, hardening, worker, verification]
max-rounds: 2
---

## Intent

Close the borrowed-certification hole (reviewer without bash certified worker-reported numbers
as PASS) and the verify-before-edit hole (worker ran the suite, then edited docs → stale
counts, 3rd recurrence). Both fixes are short rule insertions into existing role prompts.

## Decisions

- D4 (plan 20260822-004): `agents/reviewer.md` — new section **"Step 0b — Capability check
  (VOID rule)"** immediately after the GUARD:
  - "If your bash tool is missing or unusable, every Test:/mechanical layer you cannot run
    yourself is **VOID** — you must NEVER report it as PASS based on worker or sibling reports.
    Borrowed evidence is not evidence."
  - "Any VOID mechanical layer ⇒ overall verdict `ok: false` with the line
    `VOID: <layer list> — orchestrator must re-run with an execution-capable reviewer.`"
  - Static/reading layers (Decisions verification, boundary review via reads) may still pass —
    only execution-dependent layers VOID.
- D5: `agents/worker.md` — in "Self-verify as you go", append:
  - "**Evidence timing**: verification counts as evidence ONLY if run AFTER your final file
    edit. A suite run before your last edit is stale — re-run it before reporting."
  - "**Count derivation**: any count you write into docs (test steps, file counts) must come
    from a post-edit run, never from memory or a pre-edit run."
- Edits are minimal insertions — role files are verbatim subagent prompts; do not restructure,
  reword existing rules, or touch the GUARD/anti-scaffold text.

## Boundaries

### Allowed Changes
- agents/reviewer.md
- agents/worker.md

### Forbidden
- Everything else — agents/registry.md + dispatch-shapes.md (T2's), scripts/**, models/**, tests/**, README.md, .workflows/**, extensions/**, templates/**, prompts/**

## Completion Criteria

Scenario: VOID rule present and binding
  Test: grep -n "VOID" agents/reviewer.md
  Then Step 0b exists; contains "NEVER" + "PASS" + borrowed-evidence rule; any-VOID ⇒ ok:false + orchestrator-must-re-run line

Scenario: Partial-VOID semantics correct
  Test: read the inserted section
  Then execution-dependent layers VOID; read-only layers may still pass; verdict rule unambiguous

Scenario: Worker evidence-timing rule present
  Test: grep -n "after your final file edit\|post-edit" agents/worker.md
  Then Self-verify section carries both rules (evidence timing + count derivation)

Scenario: GUARD and anti-scaffold text intact
  Test: grep -c "VOID — wrong working directory" agents/reviewer.md && grep -c "Anti-scaffold clause" agents/worker.md
  Then both intact (1 each); no existing rule reworded (diff shows insertions only)

Scenario: Role files stay prompts
  Test: git diff --stat
  Then only the two role files changed; net insertions ≤40 lines total
