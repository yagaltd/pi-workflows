---
name: flows
description: Declarative flow files (.workflows/flows/*.json) — steps, waves, gates; validated before run, executed as input to the dispatcher via flow-run. Use when authoring or running a flow.
---

# Flows

A flow is declarative data: steps with waves and gates, validated before run,
compiled onto the dispatcher (`resolveNext`). One format — JSON; one runner —
`scripts/flow-run.mjs`.

## Format

```json
{
  "slug": "two-phase-tdd",
  "title": "Two-phase TDD chain",
  "steps": [
    { "id": "tests", "kind": "task", "title": "...", "tier": "B", "wave": 1,
      "depends_on": [], "tdd": false, "allowed": ["tests/"], "verify": "bun test",
      "model": "standard", "thinking": "medium", "role": "tester" },
    { "id": "red-gate", "kind": "gate", "gate": "test-quality", "wave": 2, "depends_on": ["tests"] }
  ]
}
```

- Kinds: `task` (dispatched worker), `gate` (contract | test-quality | review),
  `transform` (records deterministic `set` fields into the run report),
  `decision` (one calibrated judge call; answers recorded; `assert` on
  `equals` / `in` / `min_confidence` — unmet assert fails the step, an
  unavailable judge is a loud `skipped`).
- `wave` orders execution; `depends_on` gates within and across waves.
- Validation blocks before any dispatch: `schema-invalid`, `dup-id`,
  `unknown-kind`, `self-edge`, `cycle`, `missing-ref`, `empty-wave`,
  `bad-dep-wave`.

## Decision steps

```json
{ "id": "triage", "kind": "decision", "wave": 1, "depends_on": [],
  "questions": [
    { "id": "route", "prompt": "Which does this request touch?", "kind": "choose",
      "options": ["current_spec", "amend_needed", "unrelated", "clarification"] },
    { "id": "sure", "prompt": "How confident?", "kind": "probability" }
  ],
  "assert": { "question": "sure", "min_confidence": 0.85 } }
```

One calibrated call through `scripts/judge.mjs ask` — the repository's single
judge client. Answers land in the run report and flow state; a failed assert
fails the step; an unavailable judge is a loud `skipped`.

## Intent guard

Before dispatching on a user query, classify it against the live plan:

```bash
node scripts/intent-guard.mjs --query "..." [--threshold 0.85]
```

Routes: `proceed` (related ≥ threshold) · `amend` (route to /amend) ·
`answer` (unrelated) · `ask` (clarification or low confidence) ·
`ask-human` (judge unavailable — fail-open). Every verdict lands in
`.workflows/intent/trail.jsonl`. The guard routes, never dispatches.

## Run

```bash
node scripts/flow-run.mjs .workflows/flows/two-phase-tdd.json            # control plane
node scripts/flow-run.mjs .workflows/flows/two-phase-tdd.json --dry-run  # gates printed, not run
```

Packs land in `.workflows/flows/runs/<slug>/pack-<id>.txt` — dispatch them
through `/next` as usual. Gates reuse the repo's own command sets; an absent
toolchain is a loud `skipped`, never a pass.

Doc-gate rule: task packs whose Allowed Changes touch a doc surface —
docs/, prompts/, skills/, agents/, README.md, CHANGELOG.md — set `verify`
to include `just docs` alongside the task's own test command, so doc-drift
is caught in the same verify pass (`scripts/check-drift.sh`).

SHIP still runs the golden eval
gate (Layer 5 — the golden-evals flip-watching stage of /review Stage 1).
