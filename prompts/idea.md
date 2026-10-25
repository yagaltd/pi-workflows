---
description: "Idea — productize: explore → grill decisions → plan → specs → approval"
---

Follow the 'idea' skill workflow — load its SKILL.md with the read tool, then execute it.

Bootstrap `.workflows/` then explore the repo/docs/tests/history first. Build a decision tree from evidence. Ask only unresolved decisions, with recommendations. Then write `.workflows/plan.md` and `.workflows/specs/*.spec`. Stop for approval.

Casual intake: when standalone requirement candidates surface (a feature ask, a guardrail), emit them as marked requirement blocks — format and rules in `tests/intake/README.md` — to `.workflows/intake/<date>-<slug>.md`, then run `agent-spec requirements import --from <file> --check --out .workflows/requirements/` and fix any block errors it reports (`drifted` lines only mean not-yet-imported candidates — expected before approval). Then stop: the real import runs only on explicit human approval of specific blocks (approved blocks go to a clean file first — the import has no per-block filter); rejected blocks stay in the intake file annotated `rejected: <reason>`.

$@
