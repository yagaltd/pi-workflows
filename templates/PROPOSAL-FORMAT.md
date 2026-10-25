# Proposal format

Every plan proposal (`.workflows/proposals/<date>-<slug>.md`) carries the house
sections plus the two governance sections below. A proposal missing either
governance section fails review.

## Refactor assessment (mandatory)

State the overlap scan result and the verdict before any task is written:

- **Scan**: which existing files/flows does this plan touch, and what already
  covers the need?
- **Verdict** (pick one):
  - `clean-slate` — nothing existing covers the need; build new.
  - `extend` — an existing flow covers part of the need; this plan extends it.
  - `refactor-first` — existing structure blocks the plan; refactor lands first,
    then the plan's tasks build on the refactored base.
- **Block rule**: overlap discovered mid-plan that contradicts the verdict stops
  the plan and escalates to the human. Never absorb silent overlap.

## Docs impact (mandatory)

Declare every doc this plan must update, and the CHANGELOG entry:

```
Docs impact:
- `docs/<path>.md` — <what changes>
- `README.md` — <what changes>
- CHANGELOG: <version + one-line entry>
```

The archive gate (`scripts/check-archive.sh`) reads this declaration at SHIP:
every declared path must exist (updated) and CHANGELOG must mention the Plan ID.
A missing declaration fails the archive with a pointer to this template.
