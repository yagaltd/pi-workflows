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
  `transform` (records deterministic `set` fields into the run report).
- `wave` orders execution; `depends_on` gates within and across waves.
- Validation blocks before any dispatch: `schema-invalid`, `dup-id`,
  `unknown-kind`, `self-edge`, `cycle`, `missing-ref`, `empty-wave`,
  `bad-dep-wave`.

## Run

```bash
node scripts/flow-run.mjs .workflows/flows/two-phase-tdd.json            # control plane
node scripts/flow-run.mjs .workflows/flows/two-phase-tdd.json --dry-run  # gates printed, not run
```

Packs land in `.workflows/flows/runs/<slug>/pack-<id>.txt` — dispatch them
through `/next` as usual. Gates reuse the repo's own command sets; an absent
toolchain is a loud `skipped`, never a pass. SHIP still runs the golden eval
gate (Layer 5).
