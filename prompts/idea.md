---
description: "Idea — productize: explore → grill decisions → plan → specs → approval"
---

Follow the 'idea' skill workflow — load its SKILL.md with the read tool, then execute it.

Bootstrap `.workflows/` then explore the repo/docs/tests/history first. Build a decision tree from evidence. Ask only unresolved decisions, with recommendations. Then write `.workflows/plan.md` and `.workflows/specs/*.spec`. Stop for approval.

Casual intake: when standalone requirement candidates surface (a feature ask, a guardrail), emit them as marked requirement blocks — format and rules in `tests/intake/README.md` — to `.workflows/intake/<date>-<slug>.md`, and annotate rejected blocks `rejected: <reason>`. Then stop at the human approval gate — that gate is the end of this workflow. The import step is DEFERRED: `agent-spec requirements import` does not exist in the installed agent-spec binary (0.2.7) or in the repo, so there is no command to run here and nothing to verify — never tell the user their blocks were imported or check them against `.workflows/requirements/` (`DEC-007`).

$@
