---
description: "Abort — abandon the live plan, archive it to .workflows/archive/superseded/"
---

Abandon the current plan and preserve its history.

1. Read `.workflows/plan.md`. If it does not exist, say so and stop.
2. Confirm with the human: show task summary (done/failed/remaining) and the
   abort reason (from the argument or ask one question max).
3. Archive the bundle:

```bash
mkdir -p .workflows/archive/superseded
```

Move (not copy) into `.workflows/archive/superseded/<PlanID>-<slug>/`:
- `.workflows/plan.md`
- `.workflows/specs/`
- `.workflows/reviews/` (if present)

4. In the archived plan.md set `Status: SUPERSEDED` and add an
   `Aborted: <date> — <reason>` line under the header.
5. Snapshot durable knowledge: copy `.workflows/CONTEXT.md` →
   `CONTEXT.snapshot.md` inside the archive bundle (the live CONTEXT.md,
   ADRs, and LOG.md stay).
6. Append one line to `.workflows/LOG.md`:
   `<date> ABORT <PlanID> <slug> — <reason>`
7. If the supersession is a hard-to-reverse decision, write an ADR in
   `.workflows/docs/adr/` per the ADR template.
8. Report: archived path, tasks completed at abort time, and what the next
   `/idea` will start from (fresh Plan ID derived from the archive listing).

Never archive CONTEXT.md, `docs/adr/`, or LOG.md — they outlive every plan.
Never delete anything; abort archives, it does not destroy.

$@
